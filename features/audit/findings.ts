import type { Finding } from "./report-schema";
import type { AnalysisBundle } from "./scoring";
import { formatBytes } from "@/lib/utils";

let seq = 0;
function det(partial: Omit<Finding, "id" | "source" | "confidence">): Finding {
  seq += 1;
  return {
    ...partial,
    id: `det-${seq.toString().padStart(2, "0")}`,
    source: "deterministic",
    confidence: 1,
  };
}

export function generateDeterministicFindings(
  bundle: AnalysisBundle,
): Finding[] {
  seq = 0;
  const findings: Finding[] = [];
  const { snapshot, html, images, links, security, seo, performance } = bundle;

  if (snapshot && snapshot.status >= 400) {
    findings.push(
      det({
        category: "html",
        severity: snapshot.status >= 500 ? "high" : "medium",
        title: `Page responded with HTTP ${snapshot.status}`,
        description: `The final URL returned an error status. The audit analyzed whatever markup was sent, which may be an error page rather than real content.`,
        evidence: `GET ${snapshot.finalUrl} → HTTP ${snapshot.status}`,
        recommendation:
          "Confirm the URL serves HTTP 200. If automated requests are blocked, allowlist the audit agent's User-Agent.",
        codeExample: null,
        affectedElements: [],
      }),
    );
  }

  if (html) {
    if (!html.title) {
      findings.push(
        det({
          category: "seo",
          severity: "critical",
          title: "Missing <title> element",
          description:
            "Every indexable page needs a unique, descriptive title. It is the strongest on-page relevance signal and the headline in search results.",
          evidence: "The <head> contains no <title> element.",
          recommendation: "Add a unique 10–60 character <title> per page.",
          codeExample: `// app/layout.tsx (Next.js App Router)\nexport const metadata = {\n  title: { default: "My Product", template: "%s · My Product" },\n};`,
          affectedElements: [],
        }),
      );
    }

    if (!html.viewport) {
      findings.push(
        det({
          category: "html",
          severity: "high",
          title: "Missing responsive viewport",
          description:
            "Without a viewport meta tag, mobile browsers render the page at desktop width and zoom out — failing mobile-friendliness.",
          evidence: 'No <meta name="viewport"> found.',
          recommendation:
            'Add <meta name="viewport" content="width=device-width, initial-scale=1">. In Next.js App Router, export a `viewport` object.',
          codeExample: `// app/layout.tsx\nimport type { Viewport } from "next";\nexport const viewport: Viewport = {\n  width: "device-width",\n  initialScale: 1,\n};`,
          affectedElements: [],
        }),
      );
    }

    if (!html.language) {
      findings.push(
        det({
          category: "accessibility",
          severity: "medium",
          title: "Missing lang attribute",
          description:
            "The document language drives screen-reader pronunciation and translation tooling.",
          evidence: "<html> has no lang attribute.",
          recommendation:
            'Set lang on the root element, e.g. <html lang="en">.',
          codeExample: null,
          affectedElements: [],
        }),
      );
    }

    for (const warning of html.outlineWarnings.slice(0, 3)) {
      findings.push(
        det({
          category: "accessibility",
          severity:
            warning.includes("<h1>") || warning.includes("main")
              ? "medium"
              : "low",
          title: warning.replace(/\.$/, ""),
          description:
            "A logical heading outline and landmark regions let assistive-technology users navigate the page efficiently.",
          evidence: `Detected: ${warning}`,
          recommendation:
            "Use exactly one <h1>, don't skip heading levels, and wrap primary content in <main> with navigation in <nav>.",
          codeExample: null,
          affectedElements: [],
        }),
      );
    }

    if (html.duplicateIds.length > 0) {
      findings.push(
        det({
          category: "html",
          severity: "medium",
          title: `Duplicate element IDs (${html.duplicateIds.length})`,
          description:
            "IDs must be unique. Duplicates break label association, ARIA references, and anchor navigation.",
          evidence: `Duplicated: ${html.duplicateIds
            .slice(0, 5)
            .map((id) => `#${id}`)
            .join(", ")}`,
          recommendation:
            "Rename duplicates or switch to classes for styling hooks.",
          codeExample: null,
          affectedElements: html.duplicateIds.slice(0, 5).map((id) => `#${id}`),
        }),
      );
    }
  }

  if (images) {
    if (images.missingAlt > 0) {
      const sample = images.evidence.find((e) => e.issue === "missing_alt");
      findings.push(
        det({
          category: "accessibility",
          severity: "high",
          title: `${images.missingAlt} image(s) missing the alt attribute`,
          description:
            "Images without alt are read out as filenames (or silence) by screen readers, and lose image-search traffic.",
          evidence: sample
            ? `Example: ${sample.src.slice(0, 140)}`
            : `${images.missingAlt} of ${images.total} images affected.`,
          recommendation:
            'Add meaningful alt text. Use alt="" ONLY for purely decorative images.',
          codeExample: `// Next.js\nimport Image from "next/image";\n\n<Image src="/chart.png" width={640} height={360}\n  alt="Quarterly revenue grew 23% year over year" />`,
          affectedElements: images.evidence
            .filter((e) => e.issue === "missing_alt")
            .slice(0, 5)
            .map((e) => e.src.slice(0, 200)),
        }),
      );
    }
    if (images.needsReviewEmptyAlt > 0) {
      findings.push(
        det({
          category: "accessibility",
          severity: "info",
          title: `${images.needsReviewEmptyAlt} image(s) with empty alt need review`,
          description:
            'Empty alt (alt="") is correct ONLY when an image is purely decorative. These images have empty alt without decorative markers — their intent is uncertain.',
          evidence:
            "Marked as needs-review rather than error: intent cannot be determined automatically.",
          recommendation:
            'Review each: add descriptive alt if the image conveys meaning, or add role="presentation" if decorative.',
          codeExample: null,
          affectedElements: images.evidence
            .filter((e) => e.issue === "empty_alt_needs_review")
            .slice(0, 5)
            .map((e) => e.src.slice(0, 200)),
        }),
      );
    }
  }

  if (links) {
    if (links.unsafeTargetBlankCount > 0) {
      findings.push(
        det({
          category: "security",
          severity: "medium",
          title: `${links.unsafeTargetBlankCount} link(s) open in a new tab without rel="noopener"`,
          description:
            'target="_blank" without rel="noopener noreferrer" lets the opened page control the opener via window.opener (reverse tabnabbing).',
          evidence:
            links.unsafeTargetBlankSamples
              .slice(0, 3)
              .map((s) => s.href.slice(0, 110))
              .join("\n") || `${links.unsafeTargetBlankCount} links affected.`,
          recommendation:
            'Add rel="noopener noreferrer" to external target="_blank" links.',
          codeExample: `<a href="https://example.com" target="_blank" rel="noopener noreferrer">\n  Partner site\n</a>`,
          affectedElements: links.unsafeTargetBlankSamples
            .slice(0, 5)
            .map((s) => s.href.slice(0, 200)),
        }),
      );
    }
    if (links.checksPerformed && links.brokenCount > 0) {
      findings.push(
        det({
          category: "html",
          severity: "high",
          title: `${links.brokenCount} sampled link(s) appear broken`,
          description: `From a sample of ${links.checkedLinks.length} links, ${links.brokenCount} returned an error status or were unreachable. (Some sites reject bots with 403 — verify manually.)`,
          evidence: links.checkedLinks
            .filter((l) => !l.ok)
            .slice(0, 5)
            .map((l) => `${l.status ?? l.error} — ${l.url.slice(0, 100)}`)
            .join("\n"),
          recommendation:
            "Fix or remove dead links; they hurt UX and crawl efficiency.",
          codeExample: null,
          affectedElements: links.checkedLinks
            .filter((l) => !l.ok)
            .slice(0, 5)
            .map((l) => l.url.slice(0, 200)),
        }),
      );
    }
  }

  if (security) {
    for (const check of security.checks) {
      if (check.status !== "missing") continue;
      if (!security.missingImportant.some((h) => check.header.startsWith(h)))
        continue;
      findings.push(
        det({
          category: "security",
          severity:
            check.header === "Content-Security-Policy" ? "high" : "medium",
          title: `${check.header} header missing`,
          description: check.note,
          evidence: `No ${check.header} header in the response.`,
          recommendation:
            check.header === "Content-Security-Policy"
              ? "Start with a report-only CSP, then enforce. In Next.js, set headers in next.config or middleware."
              : `Add the ${check.header} response header.`,
          codeExample:
            check.header === "Content-Security-Policy"
              ? `// next.config.ts\nasync headers() {\n  return [{\n    source: "/:path*",\n    headers: [{\n      key: "Content-Security-Policy",\n      value: "default-src 'self'; frame-ancestors 'self'",\n    }],\n  }];\n}`
              : null,
          affectedElements: [],
        }),
      );
    }
  }

  if (seo) {
    for (const check of seo.checks) {
      if (check.ok || check.severity === "info" || check.severity === "low")
        continue;
      if (check.key === "title-present" && !html?.title) continue;

      findings.push(
        det({
          category: "seo",
          severity: check.severity,
          title: check.title,
          description: check.detail,
          evidence: check.detail,
          recommendation:
            check.key === "meta-description"
              ? 'Write a compelling 50–160 character description. In Next.js: export const metadata = { description: "…" }.'
              : "Review and fix this SEO check.",
          codeExample: null,
          affectedElements: [],
        }),
      );
    }
  }

  if (performance && performance.source === "heuristic") {
    const poor = performance.signals.filter((s) => s.status === "poor");

    for (const signal of poor.slice(0, 3)) {
      findings.push(
        det({
          category: "performance",
          severity: "medium",
          title: `${signal.label}: ${signal.value}`,
          description: `${signal.note} (Heuristic signal from the HTML document, not lab-measured data.)`,
          evidence: `${signal.label} measured as ${signal.value} from the fetched HTML (${formatBytes(snapshot?.pageSizeBytes ?? 0)}).`,
          recommendation:
            "Reduce blocking resources, compress responses, and defer non-critical work.",
          codeExample: null,
          affectedElements: [],
        }),
      );
    }
  }

  return findings.slice(0, 20);
}
