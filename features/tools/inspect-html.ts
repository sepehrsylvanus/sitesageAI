import { load } from "cheerio";

export interface HeadingItem {
  level: number;
  text: string;
}

export interface HtmlStructureAnalysis {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonical: string | null;
  language: string | null;
  viewport: string | null;
  robotsMeta: string | null;
  hasDoctype: boolean;
  headings: HeadingItem[];
  headingCounts: Record<`h${1 | 2 | 3 | 4 | 5 | 6}`, number>;
  h1Count: number;
  /** Levels skipped in the outline, e.g. h2 → h4. */
  headingSkips: Array<{ from: number; to: number }>;
  formCount: number;
  buttonCount: number;
  inputCount: number;
  landmarkCounts: Record<string, number>;
  semanticElementCounts: Record<string, number>;
  duplicateIds: string[];
  scriptCount: number;
  inlineScriptCount: number;
  stylesheetCount: number;
  imagesCount: number;
  linksCount: number;
  outlineWarnings: string[];
}

const LANDMARKS = ["header", "nav", "main", "footer", "aside"] as const;
const SEMANTIC_TAGS = [
  "article",
  "section",
  "figure",
  "figcaption",
  "time",
  "mark",
  "address",
] as const;
const MAX_HEADINGS_KEPT = 60;
const MAX_DUPLICATE_IDS = 10;

export function inspectHtmlStructure(html: string): HtmlStructureAnalysis {
  const $ = load(html);

  const title = $("head > title").first().text().trim() || null;
  const metaDescription =
    $("meta[name=description]").first().attr("content")?.trim() || null;
  const canonical =
    $('link[rel="canonical"]').first().attr("href")?.trim() || null;
  const language = $("html").first().attr("lang")?.trim() || null;
  const viewport =
    $('meta[name="viewport"]').first().attr("content")?.trim() || null;
  const robotsMeta =
    $('meta[name="robots"]').first().attr("content")?.trim() || null;
  const hasDoctype = /^\s*<!doctype\s+html/i.test(html);

  const headings: HeadingItem[] = [];

  const headingCounts = {
    h1: 0,
    h2: 0,
    h3: 0,
    h4: 0,
    h5: 0,
    h6: 0,
  };
  const headingSkips: Array<{ from: number; to: number }> = [];

  let previousLevel = 0;

  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = el.tagName.toLowerCase() as keyof typeof headingCounts;
    const level = Number(tag.slice(1));
    headingCounts[tag] += 1;
    if (headings.length < MAX_HEADINGS_KEPT) {
      headings.push({
        level,
        text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 120),
      });
    }

    if (previousLevel > 0 && level > previousLevel + 1) {
      headingSkips.push({
        from: previousLevel,
        to: level,
      });
    }

    if (level > 0) previousLevel = level;
  });

  const idCounts = new Map<string, number>();
  $("[id]").each((_, el) => {
    const id = ($(el).attr("id") ?? "").trim();
    if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  });

  const duplicateIds = [...idCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .slice(0, MAX_DUPLICATE_IDS);

  const landmarkCounts: Record<string, number> = {};

  for (const tag of LANDMARKS) {
    landmarkCounts[tag] =
      $(tag).length +
      $(
        `[role="${tag === "header" ? "banner" : tag === "footer" ? "contentinfo" : tag}"]`,
      ).length;
  }

  const semanticElementCounts: Record<string, number> = {};
  for (const tag of SEMANTIC_TAGS) {
    semanticElementCounts[tag] = $(tag).length;
  }

  const outlineWarnings: string[] = [];
  if (headingCounts.h1 === 0) {
    outlineWarnings.push("No <h1> heading found on the page.");
  }
  if (headingCounts.h1 > 1) {
    outlineWarnings.push(`Multiple <h1> headings (${headingCounts.h1}) found.`);
  }
  if (headings.length > 0 && headings[0]!.level > 1) {
    outlineWarnings.push(
      `First heading is <h${headings[0]!.level}> instead of <h1>.`,
    );
  }

  if (headingSkips.length > 0) {
    outlineWarnings.push(
      `Heading level skips detected (e.g. h${headingSkips[0]!.from} → h${headingSkips[0]!.to}).`,
    );
  }
  if ((landmarkCounts.main ?? 0) === 0) {
    outlineWarnings.push("No <main> landmark found.");
  }
  if ((landmarkCounts.nav ?? 0) === 0)
    outlineWarnings.push("No <nav> landmark found.");

  const scripts = $("script");
  const inlineScripts = scripts.filter((_, el) => !$(el).attr("src"));

  return {
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    canonical,
    language,
    viewport,
    robotsMeta,
    hasDoctype,
    headings,
    headingCounts,
    h1Count: headingCounts.h1,
    headingSkips: headingSkips.slice(0, 8),
    formCount: $("form").length,
    buttonCount:
      $("button").length +
      $('input[type="submit"], input[type="button"]').length,
    inputCount: $("input, textarea, select").length,
    landmarkCounts,
    semanticElementCounts,
    duplicateIds,
    scriptCount: scripts.length,
    inlineScriptCount: inlineScripts.length,
    stylesheetCount: $('link[rel="stylesheet"]').length,
    imagesCount: $("img").length,
    linksCount: $("a").length,
    outlineWarnings,
  };
}
