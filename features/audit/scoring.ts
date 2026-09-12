import type { WebsiteSnapshot, AuditCategory } from "./types";
import type { HtmlStructureAnalysis } from "@/features/tools/inspect-html";
import type { ImagesAnalysis } from "@/features/tools/inspect-image";
import type { LinksAnalysis } from "@/features/tools/inspect-links";
import type { SecurityHeadersAnalysis } from "@/features/tools/inspect-security";
import type { SeoAnalysis } from "@/features/tools/inspect-seo";
import type { PerformanceAnalysis } from "@/features/tools/inspect-performance";
import type { Severity } from "./types";

export interface AnalysisBundle {
  snapshot?: WebsiteSnapshot;
  html?: HtmlStructureAnalysis;
  images?: ImagesAnalysis;
  links?: LinksAnalysis;
  security?: SecurityHeadersAnalysis;
  seo?: SeoAnalysis;
  performance?: PerformanceAnalysis;
}

export interface ScoreDeduction {
  label: string;
  points: number;
}

export interface CategoryScoreResult {
  category: AuditCategory;
  evaluated: boolean;
  score: number | null;
  deductions: ScoreDeduction[];
}

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 30,
  high: 18,
  medium: 10,
  low: 6,
  info: 3,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tally(base: number, deductions: ScoreDeduction[]): number {
  return clampScore(base - deductions.reduce((sum, d) => sum + d.points, 0));
}

function cap(points: number, max: number): number {
  return Math.min(points, max);
}

function scoreSeo(bundle: AnalysisBundle): CategoryScoreResult {
  if (!bundle.seo)
    return { category: "seo", evaluated: false, score: null, deductions: [] };
  const deductions: ScoreDeduction[] = bundle.seo.checks
    .filter((c) => c.ok)
    .map((c) => ({ label: c.title, points: SEVERITY_PENALTY[c.severity] }));

  return {
    category: "seo",
    evaluated: true,
    score: tally(100, deductions),
    deductions,
  };
}

function scoreAccessibility(bundle: AnalysisBundle): CategoryScoreResult {
  const { html, images } = bundle;

  if (!html && !images) {
    return {
      category: "accessibility",
      evaluated: false,
      score: null,
      deductions: [],
    };
  }

  const deductions: ScoreDeduction[] = [];

  if (html) {
    if (!html.language)
      deductions.push({
        label: "Missing lang attribute on <html>",
        points: 15,
      });
    if ((html.landmarkCounts.main ?? 0) === 0)
      deductions.push({ label: "No <main> landmark", points: 10 });
    if ((html.landmarkCounts.nav ?? 0) === 0)
      deductions.push({ label: "No <nav> landmark", points: 5 });
    if (html.h1Count === 0)
      deductions.push({ label: "No <h1> heading", points: 10 });
    if (html.h1Count > 1)
      deductions.push({
        label: `Multiple <h1> headings (${html.h1Count})`,
        points: 5,
      });
    if (html.headingSkips.length > 0) {
      deductions.push({
        label: "Heading levels are skipped",
        points: cap(html.headingSkips.length * 4, 8),
      });
    }
    if (html.duplicateIds.length > 0) {
      deductions.push({
        label: `Duplicate element IDs (${html.duplicateIds.length})`,
        points: cap(html.duplicateIds.length * 5, 15),
      });
    }
  }

  if (images) {
    if (images.missingAlt > 0) {
      deductions.push({
        label: `${images.missingAlt} image(s) missing alt text`,
        points: cap(images.missingAlt * 6, 30),
      });
    }
    if (images.needsReviewEmptyAlt > 0) {
      deductions.push({
        label: `${images.needsReviewEmptyAlt} image(s) with questionable empty alt`,
        points: cap(images.needsReviewEmptyAlt * 2, 10),
      });
    }
  }
  return {
    category: "accessibility",
    evaluated: true,
    score: tally(100, deductions),
    deductions,
  };
}

function scorePerformance(bundle: AnalysisBundle): CategoryScoreResult {
  const perf = bundle.performance;

  if (!perf)
    return {
      category: "performance",
      evaluated: false,
      score: null,
      deductions: [],
    };

  if (perf.source === "measured" && perf.lighthousePerformanceScore !== null) {
    const deductions = perf.signals
      .filter((s) => s.status !== "good")
      .map((s) => ({ label: `${s.label}: ${s.value}`, points: 0 }));

    return {
      category: "performance",
      evaluated: true,
      score: perf.lighthousePerformanceScore,
      deductions,
    };
  }

  const deductions: ScoreDeduction[] = perf.signals
    .filter((s) => s.status !== "good")
    .map((s) => ({
      label: `${s.label}: ${s.value}`,
      points: s.status === "poor" ? 20 : 10,
    }));

  return {
    category: "performance",
    evaluated: true,
    score: tally(100, deductions),
    deductions,
  };
}

const SECURITY_PENALTY: Record<string, number> = {
  "Content-Security-Policy": 22,
  "Strict-Transport-Security": 18,
  "X-Content-Type-Options": 12,
  "Referrer-Policy": 8,
  "Permissions-Policy": 8,
  "Frame protection (X-Frame-Options / CSP frame-ancestors)": 12,
};

function scoreSecurity(bundle: AnalysisBundle): CategoryScoreResult {
  const sec = bundle.security;
  if (!sec)
    return {
      category: "security",
      evaluated: false,
      score: null,
      deductions: [],
    };

  const deductions: ScoreDeduction[] = sec.checks
    .filter((c) => c.status !== "good")
    .map((c) => ({
      label:
        c.status === "missing"
          ? `${c.header} missing`
          : `${c.header} needs attention`,
      points: Math.round(
        (SECURITY_PENALTY[c.header] ?? 8) * (c.status === "warn" ? 0.5 : 1),
      ),
    }));

  const badCookieSignals = sec.cookieObservations.filter((o) =>
    o.includes("without"),
  );
  if (badCookieSignals.length > 0) {
    deductions.push({
      label: "Cookie flags incomplete (observation)",
      points: cap(badCookieSignals.length * 4, 8),
    });
  }

  return {
    category: "security",
    evaluated: true,
    score: tally(100, deductions),
    deductions,
  };
}

function scoreHtml(bundle: AnalysisBundle): CategoryScoreResult {
  const html = bundle.html;
  if (!html)
    return {
      category: "html",
      evaluated: false,
      score: null,
      deductions: [],
    };

  const deductions: ScoreDeduction[] = [];

  if (!html.hasDoctype)
    deductions.push({ label: "Missing <!doctype html>", points: 10 });

  if (!html.title) deductions.push({ label: "Missing <title>", points: 20 });

  if (!html.viewport)
    deductions.push({ label: "Missing responsive viewport meta", points: 20 });

  if (!html.language)
    deductions.push({ label: "Missing lang attribute", points: 10 });

  if (html.duplicateIds.length > 0) {
    deductions.push({
      label: `Duplicate IDs (${html.duplicateIds.length})`,
      points: cap(html.duplicateIds.length * 5, 15),
    });
  }

  if (html.inlineScriptCount > 12) {
    deductions.push({
      label: `Many inline scripts (${html.inlineScriptCount})`,
      points: 5,
    });
  }
  return {
    category: "html",
    evaluated: true,
    score: tally(100, deductions),
    deductions,
  };
}

const CATEGORY_WEIGHTS: Record<AuditCategory, number> = {
  seo: 0.25,
  accessibility: 0.25,
  performance: 0.2,
  security: 0.15,
  html: 0.15,
};

export function computeCategoryScores(
  bundle: AnalysisBundle,
): CategoryScoreResult[] {
  return [
    scoreSeo(bundle),
    scoreAccessibility(bundle),
    scorePerformance(bundle),
    scoreSecurity(bundle),
    scoreHtml(bundle),
  ];
}

export function computeOverallScore(
  scores: CategoryScoreResult[],
): number | null {
  let wightSum = 0;
  let acc = 0;
  for (const s of scores) {
    if (s.evaluated && s.score !== null) {
      const w = CATEGORY_WEIGHTS[s.category];
      acc += s.score * w;
      wightSum += w;
    }
  }

  if (wightSum === 0) return null;

  return Math.round(acc / wightSum);
}
