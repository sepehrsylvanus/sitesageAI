import "server-only";
import { load } from "cheerio";
import { mapWithConcurrency } from "@/lib/utils";
import { AUDIT_LIMITS } from "@/features/audit/types";
import {
  assertPublicHostname,
  isPrivateOrReservedIp,
} from "@/features/audit/url-security";

export interface LinkCheckResult {
  url: string;
  status: number | null;
  ok: boolean;
  error: string | null;
}

export interface LinksAnalysis {
  total: number;
  internalCount: number;
  externalCount: number;
  internalSamples: string[];
  externalSamples: string[];
  emptyHrefCount: number;
  invalidHrefSamples: string[];
  unsafeTargetBlankCount: number;
  unsafeTargetBlankSamples: Array<{ href: string; anchorText: string }>;
  checkedLinks: LinkCheckResult[];
  brokenCount: number;
  /** False in modes that skip network probing — report says "not checked". */
  checksPerformed: boolean;
}

const MAX_SAMPLES = 6;
const LINK_UA = "SiteSageAI-LinkChecker/1.0";

async function probeLink(url: string): Promise<LinkCheckResult> {
  try {
    const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");

    await assertPublicHostname(hostname);
  } catch {
    return { url, status: null, ok: false, error: "blocked" };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    AUDIT_LIMITS.LINK_CHECK_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": LINK_UA,
        accept: "text/html*/*;q=0.5",
      },
    });

    await response.body?.cancel().catch(() => undefined);

    return {
      url,
      status: response.status,
      ok: response.status < 400,
      error: null,
    };
  } catch {
    return {
      url,
      status: null,
      ok: false,
      error: "unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function inspectLinks(
  html: string,
  baseUrl: string,
  options: { checkBrokenLinks: boolean },
): Promise<LinksAnalysis> {
  const $ = load(html);
  const base = new URL(baseUrl);

  let total = 0;
  let internalCount = 0;
  let externalCount = 0;
  let emptyHrefCount = 0;
  let unsafeTargetBlankCount = 0;

  const internalSamples: string[] = [];

  const externalSamples: string[] = [];

  const invalidHrefSamples: string[] = [];

  const unsafeTargetBlankSamples: Array<{ href: string; anchorText: string }> =
    [];

  const candidates = new Map<string, string>();

  $("a").each((_, el) => {
    if (total >= AUDIT_LIMITS.MAX_LINKS_ANALYZED) return false;
    total += 1;

    const anchor = $(el);
    const href = (anchor.attr("href") ?? "").trim();
    const anchorText = anchor.text().replace(/\s+/g, " ").trim().slice(0, 60);

    if (href === "" || href === "#") {
      emptyHrefCount += 1;
      return true;
    }

    if (/^(javascript:|data:|vbscript:)/i.test(href)) {
      if (invalidHrefSamples.length < MAX_SAMPLES) {
        invalidHrefSamples.push(href.slice(0, 80));
        return true;
      }
    }

    if (/^(mailto:|tel:)/i.test(href)) return true;

    let resolved: URL;

    try {
      resolved = new URL(href, base);
    } catch {
      if (invalidHrefSamples.length < MAX_SAMPLES) {
        invalidHrefSamples.push(href.slice(0, 80));
      }

      return true;
    }

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:")
      return true;

    resolved.hash = "";
    const url = resolved.toString();
    const isInternal =
      resolved.hostname.replace(/^www\./, "") ===
      base.hostname.replace(/^www\./, "");

    if (isInternal) {
      internalCount += 1;
      if (internalSamples.length < MAX_SAMPLES) internalSamples.push(url);
    } else {
      externalCount += 1;
      if (externalSamples.length < MAX_SAMPLES) externalSamples.push(url);
    }

    if (!isPrivateOrReservedIp(resolved.hostname))
      candidates.set(url, resolved.hostname);

    if (anchor.attr("target") === "_blank") {
      const rel = (anchor.attr("rel") ?? "").toLowerCase();

      if (!rel.includes("noopener") && !rel.includes("noreferrer")) {
        unsafeTargetBlankCount += 1;

        if (unsafeTargetBlankSamples.length < MAX_SAMPLES) {
          unsafeTargetBlankSamples.push({
            href: url,
            anchorText: anchorText || "(no text)",
          });
        }
      }
    }

    return true;
  });

  let checkedLinks: LinkCheckResult[] = [];

  if (options.checkBrokenLinks && candidates.size > 0) {
    const ordered = [...candidates.keys()].sort((a, b) => {
      const aInternal =
        new URL(a).hostname.replace(/^www\./, "") ===
        base.hostname.replace(/^www\./, "")
          ? 0
          : 1;

      const bInternal =
        new URL(b).hostname.replace(/^www\./, "") ===
        base.hostname.replace(/^www\./, "")
          ? 0
          : 1;

      return aInternal - bInternal;
    });

    const sample = ordered.slice(0, AUDIT_LIMITS.MAX_LINK_CHECKS);
    checkedLinks = await mapWithConcurrency(
      sample,
      AUDIT_LIMITS.LINK_CHECK_CONCURRENCY,
      probeLink,
    );
  }

  return {
    total,
    internalCount,
    externalCount,
    internalSamples,
    externalSamples,
    emptyHrefCount,
    invalidHrefSamples,
    unsafeTargetBlankCount,
    unsafeTargetBlankSamples,
    checkedLinks,
    brokenCount: checkedLinks.filter((l) => !l.ok).length,
    checksPerformed: options.checkBrokenLinks,
  };
}
