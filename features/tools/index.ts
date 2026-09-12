import "server-only";
import { AppError } from "@/lib/errors";
import { formatBytes } from "@/lib/utils";
import { fetchWebsiteSnapshot } from "@/features/audit/fetcher";
import { normalizeUrl } from "@/features/audit/url-security";
import type { AnalysisBundle } from "@/features/audit/scoring";
import type { AuditMode } from "@/features/audit/types";
import { inspectHtmlStructure } from "./inspect-html";
import { inspectImages } from "./inspect-image";
import { inspectLinks } from "./inspect-links";
import { inspectSecurityHeaders } from "./inspect-security";
import { inspectSeo } from "./inspect-seo";
import { inspectPerformance } from "./inspect-performance";
import { toolArgsSchemas, type ToolName } from "@/features/agent/schemas";

export interface AgentToolContext {
  mode: AuditMode;
  auditedUrl: string;
  bundle: AnalysisBundle;
}

export interface ToolOutcome {
  ok: boolean;
  summary: string;
  compact: unknown;
}

function failure(
  summary: string,
  compact: Record<string, unknown>,
): ToolOutcome {
  return {
    ok: false,
    summary,
    compact,
  };
}

function needSnapshot(): ToolOutcome {
  return failure("No snapshot available yet", {
    error: "SNAPSHOT_REQUIRED",
    hint: "Call fetch_website_snapshot first;",
  });
}

export async function executeAgentTool(
  name: ToolName,
  rawArgs: unknown,
  ctx: AgentToolContext,
): Promise<ToolOutcome> {
  const parsed = toolArgsSchemas[name].safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return failure("Tool arguments failed validation", {
      error: "INVALID_ARGUMENTS",
      hint: "Resend arguments matching the tool's JSON schema.",
    });
  }

  switch (name) {
    case "fetch_website_snapshot": {
      const args = parsed.data as { url: string };
      let modelHost: string;
      let auditedHost: string;
      try {
        modelHost = new URL(normalizeUrl(args.url)).hostname;
        auditedHost = new URL(ctx.auditedUrl).hostname;
      } catch (error) {
        return failure("The URL argument is not a valid URL", {
          error: "INVALID_ARGUMENTS",
        });
      }
      if (modelHost !== auditedHost) {
        return failure("Only the audited URL may be fetched", {
          error: "SINGLE_URL_VIOLATION",
          auditedUrl: ctx.auditedUrl,
        });
      }

      if (ctx.bundle.snapshot) {
        const s = ctx.bundle.snapshot;
        return {
          ok: true,
          summary: `Cached snapshot · HTTP ${s.status}`,
          compact: compactSnapshot(s),
        };
      }

      const snapshot = await fetchWebsiteSnapshot(ctx.auditedUrl);
      ctx.bundle.snapshot = snapshot;
      return {
        ok: true,
        summary: `HTTP ${snapshot.status} · ${formatBytes(snapshot.pageSizeBytes)} · ${snapshot.responseTimeMs} ms`,
        compact: compactSnapshot(snapshot),
      };
    }

    case "inspect_html_structure": {
      if (!ctx.bundle.snapshot) return needSnapshot();
      const analysis = (ctx.bundle.html ??= inspectHtmlStructure(
        ctx.bundle.snapshot.html,
      ));
      return {
        ok: true,
        summary: `Title ${analysis.title ? "present" : "missing"} · ${analysis.h1Count} <h1> · ${analysis.outlineWarnings.length} outline warnings`,
        compact: {
          title: analysis.title,
          titleLength: analysis.titleLength,
          metaDescription: analysis.metaDescription,
          canonical: analysis.canonical,
          language: analysis.language,
          viewport: analysis.viewport,
          robotsMeta: analysis.robotsMeta,
          hasDoctype: analysis.hasDoctype,
          headingCounts: analysis.headingCounts,
          headingSkips: analysis.headingSkips,
          topHeadings: analysis.headings.slice(0, 12),
          formCount: analysis.formCount,
          buttonCount: analysis.buttonCount,
          inputCount: analysis.inputCount,
          landmarkCounts: analysis.landmarkCounts,
          semanticElementCounts: analysis.semanticElementCounts,
          duplicateIds: analysis.duplicateIds,
          scriptCount: analysis.scriptCount,
          stylesheetCount: analysis.stylesheetCount,
          outlineWarnings: analysis.outlineWarnings,
        },
      };
    }

    case "inspect_images": {
      if (!ctx.bundle.snapshot) return needSnapshot();
      const analysis = (ctx.bundle.images ??= inspectImages(
        ctx.bundle.snapshot.html,
        ctx.bundle.snapshot.finalUrl,
      ));
      return {
        ok: true,
        summary: `${analysis.total} images · ${analysis.missingAlt} missing alt · ${analysis.needsReviewEmptyAlt} to review`,
        compact: analysis,
      };
    }

    case "inspect_links": {
      if (!ctx.bundle.snapshot) return needSnapshot();
      if (!ctx.bundle.links) {
        ctx.bundle.links = await inspectLinks(
          ctx.bundle.snapshot.html,
          ctx.bundle.snapshot.finalUrl,
          {
            checkBrokenLinks: ctx.mode === "full",
          },
        );
      }
      const analysis = ctx.bundle.links;
      return {
        ok: true,
        summary: `${analysis.total} links · ${analysis.unsafeTargetBlankCount} unsafe _blank · ${analysis.checksPerformed ? `${analysis.brokenCount}/${analysis.checkedLinks.length} sampled broken` : "broken links not probed"}`,
        compact: analysis,
      };
    }

    case "inspect_security_headers": {
      if (!ctx.bundle.snapshot) return needSnapshot();
      const analysis = (ctx.bundle.security ??= inspectSecurityHeaders(
        ctx.bundle.snapshot.headers,
      ));
      return {
        ok: true,
        summary: `${analysis.presentCount}/6 header checks pass · ${analysis.missingImportant.length} important missing`,
        compact: analysis,
      };
    }

    case "inspect_seo": {
      if (!ctx.bundle.snapshot) return needSnapshot();
      if (!ctx.bundle.seo) {
        ctx.bundle.seo = await inspectSeo(
          ctx.bundle.snapshot.html,
          ctx.bundle.snapshot.finalUrl,
        );
      }
      const analysis = ctx.bundle.seo;
      const failed = analysis.checks.filter((c) => !c.ok);
      return {
        ok: true,
        summary: `${analysis.passedCount}/${analysis.checks.length} checks pass · ${failed.length} issues`,
        compact: analysis,
      };
    }

    case "inspect_performance": {
      if (!ctx.bundle.snapshot) return needSnapshot();
      if (!ctx.bundle.performance) {
        ctx.bundle.performance = await inspectPerformance(ctx.bundle.snapshot);
      }
      const analysis = ctx.bundle.performance;
      return {
        ok: true,
        summary:
          analysis.source === "measured"
            ? `Measured (Lighthouse): score ${analysis.lighthousePerformanceScore ?? "n/a"}`
            : `Heuristic signals from document · 0 fabricated metrics`,
        compact: analysis,
      };
    }
  }
}

function compactSnapshot(
  s: NonNullable<AnalysisBundle["snapshot"]>,
): Record<string, unknown> {
  return {
    requestedUrl: s.requestedUrl,
    finalUrl: s.finalUrl,
    status: s.status,
    contentType: s.contentType,
    responseTimeMs: s.responseTimeMs,
    pageSizeBytes: s.pageSizeBytes,
    htmlTruncated: s.htmlTruncated,
    redirectCount: s.redirectCount,
    note: "HTML body is held in the run context — other tools analyze it for you.",
  };
}
