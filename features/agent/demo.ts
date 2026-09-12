import "server-only";
import { sleep } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import type { AuditMode, WebsiteSnapshot } from "@/features/audit/types";
import { computeCategoryScores } from "@/features/audit/scoring";
import { generateDeterministicFindings } from "@/features/audit/findings";
import { composeAuditReport } from "@/features/audit/report";
import type { ModelReport } from "@/features/audit/report-schema";
import { executeAgentTool, type AgentToolContext } from "@/features/tools";
import { AGENT_TOOLS, TOOLS_BY_MODE, type ToolName } from "./schemas";
import { emitEvent, startTool, finishTool, type AuditRun } from "./run-store";

const DEMO_URL = "https://aurora-roasters.dev/";

const AUDIT_STEP_LABEL = (total: number) => `${Math.min(total, 8)}`;

const DEMO_HTML = `<!doctype html>
<html lang="en">
<head>
  <title>Aurora Roasters — Small-batch specialty coffee, roasted every Friday in Portland and shipped worldwide within 24h</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/fonts.css">
  <link rel="stylesheet" href="/assets/carousel.css">
  <script type="application/ld+json">
    { "@context": "https://schema.org", "@type": "LocalBusiness", "name": "Aurora Roasters" }
  </script>
  <script src="/assets/analytics.js"></script>
  <script src="/assets/carousel.js"></script>
  <script src="/assets/scroll.js"></script>
  <script>window.__promo = true;</script>
</head>
<body>
  <header id="menu">
    <a href="#"><img src="/assets/img_0042.png" width="180"></a>
    <a href="/shop">Shop</a>
    <a href="/story">Our story</a>
  </header>
  <section>
    <h1>Small-batch coffee, roasted weekly</h1>
    <p>Fresh harvest, honest sourcing.</p>
    <img src="/assets/hero-coffee.jpg" width="1200" height="630" loading="lazy" alt="A barista pouring a rosetta into a flat white">
    <img src="/assets/beans-texture.jpg">
    <img src="/assets/decorative-swirl.svg" alt="">
    <h2>This week's roast</h2>
    <h4>Ethiopia Guji — tasting notes</h4>
    <form action="/subscribe">
      <input type="email" placeholder="Email for roast alerts">
      <button>Notify me</button>
    </form>
    <a href="/wholesale">Wholesale</a>
    <a href="https://instagram.example.com/aurora" target="_blank">Instagram</a>
    <a href="https://sq.example.com/aurora" target="_blank" rel="noreferrer">Order ahead</a>
  </section>
  <footer id="menu">
    <script src="/assets/footer.js"></script>
    <script>console.log("footer ready");</script>
  </footer>
</body>
</html>`;

function demoSnapshot(): WebsiteSnapshot {
  return {
    requestedUrl: DEMO_URL,
    finalUrl: DEMO_URL,
    status: 200,
    contentType: "text/html; charset=utf-8",
    responseTimeMs: 640,
    headers: {
      "content-type": "text/html; charset=utf-8",
      server: "nginx",
      "x-powered-by": "Express",
      "x-content-type-options": "nosniff",
      "set-cookie": "session=abc123; Path=/",
      // Deliberately missing: CSP, HSTS, frame protection, referrer/permissions policy.
    },
    html: DEMO_HTML,
    htmlTruncated: false,
    pageSizeBytes: new TextEncoder().encode(DEMO_HTML).byteLength,
    redirectCount: 0,
    fetchedAt: new Date().toISOString(),
  };
}

function synthesizeDemoReport(ctx: AgentToolContext): ModelReport {
  const { html, images, links, security, seo } = ctx.bundle;
  const seoFailed = seo?.checks.filter((c) => !c.ok).length ?? 0;

  return {
    summary: [
      `Aurora Roasters has genuinely good bones — valid doctype, responsive viewport, one clear <h1> and LocalBusiness structured data.`,
      `The audit found ${seoFailed} SEO gaps (a missing meta description and canonical stand out), several absent security headers, and ${images?.missingAlt ?? 0} image(s) without alt text.`,
      `None of the issues are exotic: a focused afternoon of work would fix the critical and high items.`,
    ].join(" "),
    categorySummaries: {
      seo: `Missing meta description and canonical tag; the 78-character title will truncate in search results. ${seo?.structuredData.present ? "JSON-LD LocalBusiness data is a strong positive." : ""}`,
      accessibility: `${images?.missingAlt ?? 0} image(s) lack alt text, the outline skips from h2 to h4, and the #menu id is duplicated between header and footer. The landmark structure has a <main>-less layout with no <nav>.`,
      performance:
        "Heuristic signals from the document only: page weight and 6 script tags are moderate; no lab measurements were taken.",
      security: `${security?.missingImportant.length ?? 0} important headers missing (CSP, HSTS) plus no clickjacking protection; a cookie without Secure/HttpOnly/SameSite flags was observed.`,
      html: "The skeleton is valid and semantic-leaning, but duplicate IDs and a missing <nav> landmark hurt document quality.",
    },
    findings: [
      {
        id: "title-too-long",
        category: "seo",
        severity: "low",
        title: "Title likely truncates in search results",
        description: `The page title is ${html?.titleLength ?? 0} characters. Search engines commonly truncate beyond ~60 characters, cutting off the value proposition.`,
        evidence: `"${(html?.title ?? "").slice(0, 80)}…" (${html?.titleLength ?? 0} chars)`,
        recommendation:
          "Keep titles under ~60 characters, front-loading the unique value.",
        codeExample: `// app/layout.tsx\nexport const metadata = {\n  title: "Aurora Roasters — Small-batch coffee, roasted weekly",\n};`,
        confidence: 0.9,
        affectedElements: ["<title>"],
      },
      {
        id: "social-preview-gap",
        category: "seo",
        severity: "low",
        title: "No social preview metadata",
        description:
          "Open Graph and Twitter Card tags are absent, so shared links render without image or description — costing click-through from social channels.",
        evidence: "Zero og:* properties and no twitter:card meta detected.",
        recommendation:
          "Add Open Graph + Twitter metadata via the Next.js Metadata API.",
        codeExample: `// app/layout.tsx\nexport const metadata = {\n  openGraph: {\n    title: "Aurora Roasters",\n    description: "Small-batch coffee, roasted weekly.",\n    images: ["/og-cover.jpg"],\n  },\n  twitter: { card: "summary_large_image" },\n};`,
        confidence: 0.95,
        affectedElements: [],
      },
      {
        id: "script-count-creeping",
        category: "performance",
        severity: "low",
        title: "Six script tags for a mostly static page",
        description:
          "The document references 4 external scripts plus 2 inline blocks. On a content-first page this is likely more JavaScript than the experience needs.",
        evidence:
          "Heuristic signal: script tags = 6 (2 inline). Not lab-measured data.",
        recommendation:
          "Audit each script's value; defer non-critical ones and collapse inline snippets.",
        codeExample: `import Script from "next/script";\n\n<Script src="/assets/analytics.js" strategy="afterInteractive" />`,
        confidence: 0.7,
        affectedElements: [
          "analytics.js",
          "carousel.js",
          "scroll.js",
          "footer.js",
        ],
      },
    ],
    prioritizedActionPlan: [
      {
        priority: 1,
        title: "Write a meta description and canonical tag",
        impact: "high",
        effort: "low",
        steps: [
          "Draft a 120–150 character description with the core offer.",
          "Add metadata.description in app/layout.tsx (or the page's metadata export).",
          'Set alternates.canonical to "https://aurora-roasters.dev/".',
        ],
      },
      {
        priority: 2,
        title: "Add alt text to the beans photo and fix the heading skip",
        impact: "high",
        effort: "low",
        steps: [
          'Describe /assets/beans-texture.jpg or mark it decorative with alt="" + role="presentation".',
          "Change the h4 'Ethiopia Guji' to an h3 so the outline flows h1 → h2 → h3.",
          "Rename the duplicated #menu id in the footer to #footer-menu.",
        ],
      },
      {
        priority: 3,
        title: "Ship baseline security headers",
        impact: "high",
        effort: "medium",
        steps: [
          "Add Content-Security-Policy starting in Report-Only mode.",
          "Enable Strict-Transport-Security on the HTTPS response.",
          'Add rel="noopener noreferrer" to the Instagram target="_blank" link.',
        ],
      },
    ],
    positiveObservations: [
      "Valid doctype, responsive viewport and exactly one <h1>.",
      "LocalBusiness JSON-LD structured data is present and parseable.",
      "The hero image uses width/height attributes and lazy loading.",
      'All external but one target="_blank" links already use noreferrer.',
      "X-Content-Type-Options: nosniff is set.",
    ],
    limitations: [
      "Demo Mode: a canned single-page snapshot was audited — no live site was fetched and no AI request was made.",
      "robots.txt and sitemap.xml could not be probed for the demo domain.",
      "Performance signals are heuristic (no Lighthouse/PSI key configured).",
      "Single-page sample only; site-wide issues may differ.",
    ],
  };
}

export async function runDemoAgent(run: AuditRun): Promise<void> {
  const ctx: AgentToolContext = {
    mode: run.mode,
    auditedUrl: DEMO_URL,
    bundle: {},
  };

  const tools = AGENT_TOOLS.filter((t) =>
    TOOLS_BY_MODE[run.mode].includes(t.name),
  );

  run.status = "planning";
  emitEvent(run, "run.started", "Agent is planning the audit", {
    detail: `Demo Mode · ${tools.length} tools · no live AI request`,
  });

  await sleep(600);
  if (cancelled(run)) return;

  run.plan = tools.map((t) => t.activityLabel);
  emitEvent(run, "plan.ready", "Audit plan ready — selecting evidence tools");
  await sleep(500);

  run.status = "running";
  let step = 0;
  for (const tool of tools) {
    if (cancelled(run)) return;
    step += 1;
    const record = startTool(run, tool.name);
    emitEvent(run, "tool.started", tool.activityLabel, {
      toolName: tool.name,
      detail: `step ${step}/${AUDIT_STEP_LABEL(tools.length)}`,
    });

    await sleep(650 + Math.random() * 250);

    if (tool.name === "fetch_website_snapshot" && !ctx.bundle.snapshot) {
      ctx.bundle.snapshot = demoSnapshot();
      finishTool(
        record,
        "completed",
        `HTTP 200 · ${formatBytes(ctx.bundle.snapshot.pageSizeBytes)} · 640 ms (canned snapshot)`,
      );
      emitEvent(run, "tool.completed", record.summary ?? "Snapshot ready", {
        toolName: tool.name,
      });
      continue;
    }

    const outcome = await executeAgentTool(tool.name as ToolName, {}, ctx);
    finishTool(record, outcome.ok ? "completed" : "failed", outcome.summary);
    emitEvent(
      run,
      outcome.ok ? "tool.completed" : "tool.failed",
      outcome.summary,
      {
        toolName: tool.name,
      },
    );
  }

  if (cancelled(run)) return;
  run.status = "synthesizing";
  emitEvent(
    run,
    "report.generating",
    "Generating prioritized recommendations (scripted)",
  );
  await sleep(900);
  if (cancelled(run)) return;

  const scores = computeCategoryScores(ctx.bundle);
  const deterministicFindings = generateDeterministicFindings(ctx.bundle);

  run.report = composeAuditReport({
    runId: run.id,
    auditedUrl: DEMO_URL,
    finalUrl: DEMO_URL,
    mode: run.mode,
    demoMode: true,
    model: "demo-synthesizer (no AI call)",
    modelOutput: synthesizeDemoReport(ctx),
    deterministicFindings,
    scores,
    toolsUsed: run.tools.map((t) => ({
      name: t.name,
      status: t.status === "failed" ? "failed" : "completed",
      durationMs: t.durationMs ?? 0,
    })),
    performanceDataSource: ctx.bundle.performance?.source ?? null,
  });

  run.status = "completed";
  emitEvent(run, "report.completed", "Audit report ready", {
    detail: `${run.report.findings.length} findings · overall ${run.report.overallScore ?? "n/a"}/100`,
  });
}

function cancelled(run: AuditRun): boolean {
  return run.status === "failed";
}

export async function buildDemoReport(mode: AuditMode = "full") {
  const ctx: AgentToolContext = {
    mode,
    auditedUrl: DEMO_URL,
    bundle: {
      snapshot: demoSnapshot(),
    },
  };

  const tools = AGENT_TOOLS.filter(
    (t) =>
      TOOLS_BY_MODE[mode].includes(t.name) &&
      t.name !== "fetch_website_snapshot",
  );

  for (const tool of tools) {
    const outcome = await executeAgentTool(tool.name, {}, ctx);
    void outcome;
  }

  const scores = computeCategoryScores(ctx.bundle);
  const deterministicFindings = generateDeterministicFindings(ctx.bundle);

  return composeAuditReport({
    runId: "example-demo-report",
    auditedUrl: DEMO_URL,
    finalUrl: DEMO_URL,
    mode,
    demoMode: true,
    model: "demo-synthesizer (no AI call)",
    modelOutput: synthesizeDemoReport(ctx),
    deterministicFindings,
    scores,
    toolsUsed: ["fetch_website_snapshot", ...tools.map((t) => t.name)].map(
      (name) => ({
        name,
        status: "completed" as const,
        durationMs: 0,
      }),
    ),
    performanceDataSource: ctx.bundle.performance?.source ?? null,
  });
}
