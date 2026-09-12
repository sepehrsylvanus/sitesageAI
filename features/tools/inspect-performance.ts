import "server-only";
import { load } from "cheerio";
import { getServerEnv } from "@/lib/env";
import { formatBytes } from "@/lib/utils";
import type { WebsiteSnapshot } from "@/features/audit/types";

export type PerformanceSource = "measured" | "heuristic";
export type SignalStatus = "good" | "warn" | "poor";

export interface PerformanceSignal {
  label: string;
  value: string;
  status: SignalStatus;
  note: string;
}

export interface CoreWebVital {
  metric: string;
  valueMs: number;
  rating: string;
}

export interface PerformanceAnalysis {
  source: PerformanceSource;
  signals: PerformanceSignal[];
  lighthousePerformanceScore: number | null;
  coreWebVitals: CoreWebVital[] | null;
  opportunities: Array<{ title: string; detail: string }>;
  warnings: string[];
}

interface PsiAudit {
  title?: string;
  displayValue?: string;
  score?: number | null;
  details?: { type?: string };
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } };
    audits?: Record<string, PsiAudit>;
  };
  loadingExperience?: {
    metrics?: Record<string, { percentile?: number; category?: string }>;
  };
}

function statusOf(value: number, warnAt: number, poorAt: number): SignalStatus {
  if (value >= poorAt) return "poor";
  if (value >= warnAt) return "warn";
  return "good";
}

function heuristicAnalysis(
  snapshot: WebsiteSnapshot,
  extraWarning?: string,
): PerformanceAnalysis {
  const $ = load(snapshot.html);
  const scriptCount = $("script").length;
  const inlineScriptCount = $("script").filter(
    (_, el) => !$(el).attr("src"),
  ).length;
  const stylesheetCount = $('link[rel="stylesheet"]').length;
  const imageCount = $("img").length;
  const resourceHints = $(
    'link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="preload"], link[rel="modulepreload"]',
  ).length;

  const signals: PerformanceSignal[] = [
    {
      label: "Server response time",
      value: `${snapshot.responseTimeMs} ms`,
      status: statusOf(snapshot.responseTimeMs, 900, 2_200),
      note: "Time to receive the HTML. Slow response times delay everything after it.",
    },
    {
      label: "HTML document weight",
      value: formatBytes(snapshot.pageSizeBytes),
      status: statusOf(snapshot.pageSizeBytes, 120_000, 400_000),
      note: "HTML only — full page weight with CSS/JS/images will be higher.",
    },

    {
      label: "Script tags",
      value: `${scriptCount} (${inlineScriptCount} inline)`,
      status: statusOf(scriptCount, 10, 22),
      note: "Each render-blocking or heavy script adds parse/compile cost on mobile.",
    },

    {
      label: "Stylesheets",
      value: `${stylesheetCount}`,
      status: statusOf(stylesheetCount, 5, 9),
      note: "Stylesheets block rendering; fewer, combined files paint sooner.",
    },

    {
      label: "Images on page",
      value: `${imageCount}`,
      status: statusOf(imageCount, 25, 50),
      note: "Unoptimized images are the most common LCP and bandwidth problem.",
    },

    {
      label: "Resource hints",
      value: resourceHints > 0 ? `${resourceHints} found` : "none",
      status: resourceHints > 0 ? "good" : "warn",
      note: "preconnect / preload hints can shave hundreds of ms off critical loads.",
    },
  ];

  const warnings: string[] = [];
  if (extraWarning) warnings.push(extraWarning);
  if (snapshot.htmlTruncated) {
    warnings.push("HTML exceeded the 1 MB analysis cap and was truncated.");
  }
  warnings.push(
    "Heuristic mode: derived from the HTML document only — not lab-measured data. Configure GOOGLE_PAGESPEED_API_KEY for Lighthouse metrics.",
  );

  return {
    source: "heuristic",
    signals,
    lighthousePerformanceScore: null,
    coreWebVitals: null,
    opportunities: [],
    warnings,
  };
}

const PSI_METRICS: Array<{ audit: string; metric: string }> = [
  { audit: "largest-contentful-paint", metric: "LCP" },
  { audit: "first-contentful-paint", metric: "FCP" },
  { audit: "total-blocking-time", metric: "TBT" },
  { audit: "speed-index", metric: "SI" },
];

async function measuredAnalysis(
  snapshot: WebsiteSnapshot,
  apiKey: string,
): Promise<PerformanceAnalysis> {
  const params = new URLSearchParams({
    url: snapshot.finalUrl,
    strategy: "mobile",
    category: "performance",
    key: apiKey,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
      {
        signal: controller.signal,
        headers: { accept: "application/json" },
      },
    );

    if (!response.ok)
      throw new Error(`PageSpeed API returned ${response.status}`);
    const data: unknown = await response.json();
    const psi = data as PsiResponse;
    const audits = psi.lighthouseResult?.audits ?? {};

    const rawScore = psi.lighthouseResult?.categories?.performance?.score;
    const score =
      typeof rawScore === "number" ? Math.round(rawScore * 100) : null;

    const signals: PerformanceSignal[] = PSI_METRICS.map(
      ({ audit, metric }) => {
        const display = audits[audit]?.displayValue ?? "n/a";
        const auditScore = audits[audit]?.score ?? null;
        return {
          label: metric,
          value: display,
          status:
            auditScore === null
              ? "warn"
              : auditScore >= 0.9
                ? "good"
                : auditScore >= 0.5
                  ? "warn"
                  : "poor",
          note: `Lighthouse lab audit: ${audit}`,
        };
      },
    );
    const clsValue = audits["cumulative-layout-shift"]?.displayValue ?? "n/a";

    signals.push({
      label: "CLS",
      value: clsValue,
      status:
        (audits["cumulative-layout-shift"]?.score ?? 0) >= 0.9
          ? "good"
          : "warn",
      note: "Lighthouse lab audit: cumulative-layout-shift",
    });

    const metrics = psi.loadingExperience?.metrics ?? {};
    const vitals: CoreWebVital[] = [];
    const vitalMap: Record<string, string> = {
      LARGEST_CONTENTFUL_PAINT_MS: "LCP",
      INTERACTION_TO_NEXT_PAINT: "INP",
      CUMULATIVE_LAYOUT_SHIFT_SCORE: "CLS",
      FIRST_CONTENTFUL_PAINT_MS: "FCP",
    };

    for (const [key, metric] of Object.entries(vitalMap)) {
      const entry = metrics[key];
      if (entry && typeof entry.percentile === "number") {
        vitals.push({
          metric,
          valueMs: entry.percentile,
          rating: entry.category ?? "UNKNOWN",
        });
      }
    }

    const opportunities = Object.values(audits)
      .filter((a) => a.details?.type === "opportunity" && (a.score ?? 1) < 0.9)
      .slice(0, 5)
      .map((a) => ({
        title: a.title ?? "Oppurtunity",
        detail: a.displayValue ?? "See Lighthouse report.",
      }));

    return {
      source: "measured",
      signals,
      lighthousePerformanceScore: score,
      coreWebVitals: vitals.length > 0 ? vitals : null,
      opportunities,
      warnings:
        vitals.length === 0
          ? [
              "Measured lab data from Lighthouse (mobile strategy). No real-user CrUX field data was available for this origin.",
            ]
          : [
              "Measured data from Lighthouse (mobile strategy) + Chrome UX Report field data.",
            ],
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function inspectPerformance(
  snapshot: WebsiteSnapshot,
): Promise<PerformanceAnalysis> {
  const { pageSpeedApiKey } = getServerEnv();
  if (!pageSpeedApiKey) return heuristicAnalysis(snapshot);

  try {
    return await measuredAnalysis(snapshot, pageSpeedApiKey);
  } catch {
    return heuristicAnalysis(
      snapshot,
      "PageSpeed Insights request failed; showing heuristic signals instead.",
    );
  }
}
