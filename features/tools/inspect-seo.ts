import "server-only";
import { load } from "cheerio";
import type { Severity } from "@/features/audit/types";
import { assertPublicHostname } from "@/features/audit/url-security";

export interface SeoCheck {
  key: string;
  ok: boolean;
  severity: Severity;
  title: string;
  detail: string;
}

export interface SeoAnalysis {
  checks: SeoCheck[];
  openGraph: { present: boolean; properties: string[] };
  twitterCard: { present: boolean; card: string | null };
  structuredData: { present: boolean; types: string[]; blockCount: number };
  robotsTxt: { checked: boolean; found: boolean | null; status: number | null };
  sitemapXml: {
    checked: boolean;
    found: boolean | null;
    status: number | null;
  };
  passedCount: number;
}

interface ProbeResult {
  found: boolean | null;
  status: number | null;
}

async function probeFile(url: string): Promise<ProbeResult> {
  try {
    await assertPublicHostname(new URL(url).hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);

    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "SiteSageAI/1.0 (seo-probe)",
          accept: "text/plain,*/*;q=0.1",
        },
      });

      await response.body?.cancel().catch(() => undefined);
      return {
        found: response.status >= 200 && response.status < 300,
        status: response.status,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { found: null, status: null };
  }
}

export async function inspectSeo(
  html: string,
  finalUrl: string,
): Promise<SeoAnalysis> {
  const $ = load(html);
  const checks: SeoCheck[] = [];

  const push = (
    key: string,
    ok: boolean,
    severity: Severity,
    title: string,
    detail: string,
  ) => checks.push({ key, ok, severity, title, detail });

  const title = $("head > title").first().text().trim();
  push(
    "title-present",
    title.length > 0,
    "critical",
    "Page Title",
    title
      ? `"${title.slice(0, 90)}" (${title.length} chars)`
      : "No <title> element found in <head>.",
  );

  if (title) {
    const lengthOk = title.length >= 10 && title.length <= 60;
    push(
      "title-length",
      lengthOk,
      "low",
      "Title length",
      lengthOk
        ? `${title.length} characters — within the common 10–60 display range.`
        : `${title.length} characters. Titles are commonly truncated outside ~10–60 characters.`,
    );
  }

  const description =
    $('meta[name="description"]').first().attr("content")?.trim() ?? "";

  push(
    "meta-description",
    description.length > 0,
    "high",
    "Meta description",
    description
      ? `${description.length} characters: "${description.slice(0, 90)}…"`
      : 'No <meta name="description"> found. Search engines may auto-generate a snippet.',
  );

  if (description) {
    const lengthOk = description.length >= 50 && description.length <= 160;
    push(
      "meta-description-length",
      lengthOk,
      "low",
      "Description length",
      lengthOk
        ? `${description.length} characters — good snippet length.`
        : `${description.length} characters. Aim for roughly 50–160 characters.`,
    );
  }

  const canonical =
    $('link[rel="canonical"]').first().attr("href")?.trim() ?? "";
  push(
    "canonical",
    canonical.length > 0,
    "medium",
    "Canonical URL",
    canonical
      ? `Declared: ${canonical.slice(0, 110)}`
      : "No canonical link. Duplicate-content consolidation relies on guesses.",
  );

  const robotsMeta = (
    $('meta[name="robots"]').first().attr("content") ?? ""
  ).toLowerCase();
  const noindex = robotsMeta.includes("noindex");
  push(
    "robots-index",
    !noindex,
    "critical",
    "Indexability",
    noindex
      ? `<meta name="robots" content="${robotsMeta}"> — the page opts OUT of indexing.`
      : robotsMeta
        ? `robots meta present ("${robotsMeta}"), page remains indexable.`
        : "No robots meta restrictions; page is indexable by default.",
  );

  const h1Count = $("h1").length;
  push(
    "single-h1",
    h1Count === 1,
    "medium",
    "Exactly one <h1>",
    h1Count === 0
      ? "No <h1> found — the main topic of the page is ambiguous."
      : h1Count === 1
        ? "Exactly one <h1> — clear primary topic."
        : `${h1Count} <h1> elements. Prefer one clear primary heading.`,
  );

  const ogProperties: string[] = [];
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr("property");
    if (property) ogProperties.push(property);
  });

  const ogPresent = ogProperties.length > 0;

  push(
    "open-graph",
    ogPresent,
    "low",
    "Open Graph metadata",
    ogPresent
      ? `Found: ${ogProperties.slice(0, 6).join(", ")}${ogProperties.length > 6 ? "…" : ""}`
      : "No og:* meta tags — link previews on social platforms will be bare.",
  );

  const twitterCard =
    $('meta[name="twitter:card"]').first().attr("content") ?? null;
  push(
    "twitter-card",
    twitterCard !== null,
    "info",
    "Twitter/X card",
    twitterCard
      ? `twitter:card = "${twitterCard}"`
      : "No twitter:card meta tag found.",
  );

  const jsonLdTypes: string[] = [];
  let jsonLdBlocks = 0;

  $('script[type="application/ld+json"]').each((_, el) => {
    jsonLdBlocks += 1;

    try {
      const parsed: unknown = JSON.parse($(el).contents().text());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === "object" && "@type" in item) {
          const type = (item as { "@type"?: unknown })["@type"];
          if (typeof type === "string") jsonLdTypes.push(type);
        }
      }
    } catch {}
  });

  const structuredPresent = jsonLdBlocks > 0;

  push(
    "structured-data",
    structuredPresent,
    "info",
    "Structured data (JSON-LD)",
    structuredPresent
      ? `${jsonLdBlocks} JSON-LD block(s)${jsonLdTypes.length ? `: ${jsonLdTypes.slice(0, 5).join(", ")}` : ""}.`
      : "No JSON-LD structured data — rich results are unlikely.",
  );
  const origin = new URL(finalUrl).origin;
  const [robotsTxt, sitemapXml] = await Promise.all([
    probeFile(`${origin}/robots.txt`),
    probeFile(`${origin}/sitemap.xml`),
  ]);

  push(
    "robots-txt",
    robotsTxt.found === true,
    "info",
    "robots.txt",
    robotsTxt.found === true
      ? `Found (${robotsTxt.status ?? 200}).`
      : robotsTxt.found === false
        ? `Not found (HTTP ${robotsTxt.status ?? "?"}). Crawlers get no directives.`
        : "Could not be checked from this environment.",
  );

  push(
    "sitemap-xml",
    sitemapXml.found === true,
    "info",
    "XML sitemap",
    sitemapXml.found === true
      ? `Found (${sitemapXml.status ?? 200}).`
      : sitemapXml.found === false
        ? `Not found at /sitemap.xml (HTTP ${sitemapXml.status ?? "?"}).`
        : "Could not be checked from this environment.",
  );

  return {
    checks,
    openGraph: { present: ogPresent, properties: ogProperties.slice(0, 10) },
    twitterCard: { present: twitterCard !== null, card: twitterCard },
    structuredData: {
      present: structuredPresent,
      types: jsonLdTypes.slice(0, 8),
      blockCount: jsonLdBlocks,
    },
    robotsTxt: { checked: true, ...robotsTxt },
    sitemapXml: { checked: true, ...sitemapXml },
    passedCount: checks.filter((c) => c.ok).length,
  };
}
