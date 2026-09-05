"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  Braces,
  CheckCircle2,
  EyeOff,
  FlaskConical,
  Gauge,
  Globe,
  KeyRound,
  ListChecks,
  Loader2,
  Play,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/ui";
import { CATEGORY_META } from "@/components/report/category-meta";

const CATEGORY_POINTS: Record<string, string[]> = {
  seo: [
    "Title & meta description quality",
    "Canonical, robots, hreflang hints",
    "Open Graph / Twitter cards",
    "JSON-LD structured data",
    "robots.txt & sitemap probes",
  ],
  accessibility: [
    "Alt text coverage & decorative heuristics",
    "Heading outline integrity",
    "Landmark regions (main/nav)",
    "Duplicate ID detection",
    "Empty-alt review, not blame",
  ],
  performance: [
    "Measured Lighthouse data (optional PSI key)",
    "Heuristics from the real document",
    "Script / stylesheet / image budgets",
    "Response-time signals",
    "No fabricated Web Vitals — ever",
  ],
  security: [
    "CSP & frame-ancestors analysis",
    "HSTS, nosniff, referrer policy",
    "Permissions-Policy coverage",
    "Cookie flag observations",
    "Honest 'one layer of defense' framing",
  ],
  html: [
    "Doctype, lang, viewport basics",
    "Semantic element census",
    "Broken-link sampling (full mode)",
    "unsafe target=_blank detection",
    "Form & interactive counts",
  ],
};

export function CategoriesSection() {
  return (
    <section className="px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Badge tone="ts">coverage</Badge>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Five audit lenses, one agent
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Each category is produced by a dedicated deterministic analyzer. The
            agent chooses which ones to run based on your audit mode.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>
          ).map((key, i) => {
            const meta = CATEGORY_META[key];
            const Icon = meta.icon;

            return (
              <div
                key={key}
                className="glass rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1 animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span
                  className="grid size-10 place-items-center rounded-xl"
                  style={{ background: `${meta.color}1f`, color: meta.color }}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {meta.label}
                </h3>
                <ul className="mt-3 space-y-1.5">
                  {(CATEGORY_POINTS[key] ?? []).map((point) => (
                    <li
                      key={point}
                      className="flex gap-2 text-xs leading-relaxed text-slate-400"
                    >
                      <span
                        className="mt-1.5 size-1 shrink-0 rounded-full"
                        style={{ background: meta.color }}
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="glass relative overflow-hidden rounded-2xl p-5">
            <div
              className="absolute inset-x-0 top-0 h-20 animate-scan bg-linear-to-b from-transparent via-ts-500/12 to-transparent"
              aria-hidden
            />

            <span className="grid size-10 place-items-center rounded-xl bg-ts-500/15 text-ts-300">
              <Gauge className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-semibold text-white">
              Measured vs heuristic
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              With a Google PageSpeed key, performance data is real Lighthouse
              output. Without one, the agent reports clearly-labelled heuristics
              and says exactly that in the report.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const EXAMPLE_FINDINGS = [
  {
    sev: "HIGH",
    tone: "text-sev-high border-sev-high/30 bg-sev-high/10",
    title: "3 images missing the alt attribute",
    evidence:
      "Example: /assets/beans-texture.jpg — assistive tech reads the filename",
    tag: "deterministic check",
  },
  {
    sev: "MEDIUM",
    tone: "text-sev-medium border-sev-medium/30 bg-sev-medium/10",
    title: "Content-Security-Policy header missing",
    evidence: "CSP is the primary browser-enforced mitigation for XSS",
    tag: "deterministic check",
  },
  {
    sev: "LOW",
    tone: "text-sev-low border-sev-low/30 bg-sev-low/10",
    title: "No social preview metadata",
    evidence: "Zero og:* properties — shared links render bare",
    tag: "ai synthesis",
  },
];
export function ExampleFindingsSection() {
  return (
    <section className="px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone="ts">output taste</Badge>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Findings with receipts
            </h2>
          </div>
          <Link
            href="/reports/example"
            className="focus-ring inline-flex items-center gap-1.5 text-sm font-medium text-ts-300 hover:text-ts-200"
          >
            Open the full example report{" "}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {EXAMPLE_FINDINGS.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider",
                    f.tone,
                  )}
                >
                  {f.sev}
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  {f.tag}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-2 rounded-lg bg-ink-950/80 p-2.5 font-mono text-[11px] leading-relaxed text-cyan-200/80">
                {f.evidence}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export function FinalCtaSection() {
  return (
    <section className="overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-20">
      <div className="relative mx-auto max-w-2xl">
        <div
          className="pointer-events-none absolute -inset-x-20 -top-10 h-56 opacity-50"
          style={{
            background:
              "radial-gradient(closest-side, rgba(34,211,238,0.18), transparent)",
          }}
          aria-hidden
        />
        <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Give the agent a URL.
          <br />
          Get a plan, not platitudes.
        </h2>
        <p className="relative mt-4 text-sm text-slate-400">
          Evidence-backed findings, Next.js code fixes, and a prioritized action
          plan — exportable as Markdown or JSON.
        </p>
        <Link href="/audit" className="relative mt-8 inline-block">
          <Button size="lg">
            <Play className="size-4" aria-hidden /> Start your first audit
          </Button>
        </Link>
      </div>
    </section>
  );
}
export function HeroSection({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const target = url.trim();
    router.push(target ? `/audit?url=${encodeURIComponent(target)}` : "/audit");
  };
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
      <div
        className="bg-grid pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-130 w-220 -translate-x-1/2 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, rgba(49,120,198,0.28), transparent)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <Badge tone="ts" className="mx-auto animate-fade-up gap-1.5">
          <ScanSearch className="size-3" aria-hidden /> tool-using ai agent ·
          not a chatbot
        </Badge>
        <h1
          className="mt-6 animate-fade-up text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-6xl"
          style={{ animationDelay: "80ms" }}
        >
          An AI agent that audits
          <span className="block bg-linear-to-r from-ts-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
            your website for real
          </span>
        </h1>
        <p
          className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-slate-400 sm:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          SiteSage plans the audit, calls deterministic tools — fetch, HTML,
          links, headers, SEO, images, performance — and synthesizes a
          prioritized, evidence-backed report. Every tool call is visible. Every
          claim cites evidence.
        </p>

        <form
          onSubmit={submit}
          className="mx-auto mt-9 flex max-w-xl animate-fade-up flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Globe
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-600"
              aria-hidden
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-site.com"
              inputMode="url"
              spellCheck={false}
              aria-label="Website URL to audit"
              className="pl-11"
            />
          </div>
          <Button type="submit" size="lg" className="shrink-0">
            <Play className="size-4" aria-hidden /> Run the agent
          </Button>
        </form>

        <p
          className="mt-4 animate-fade-up text-xs text-slate-500"
          style={{ animationDelay: "320ms" }}
        >
          {demoMode ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <FlaskConical className="size-3 text-sev-medium" aria-hidden />
                Demo Mode active — no AI key configured; audits run on a canned
                snapshot, clearly labelled.
              </span>
            </>
          ) : (
            "SSRF-protected fetching · 8-step tool budget · scores computed by code, not the model"
          )}
        </p>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Plan",
    body: "The agent receives your URL + mode and a menu of tool schemas — then decides what evidence to collect.",
  },
  {
    title: "Fetch",
    body: "fetch_website_snapshot runs through SSRF checks, DNS validation, redirect re-validation and a 1 MB body cap.",
  },
  {
    title: "Analyze",
    body: "Deterministic analyzers parse HTML with Cheerio — no remote JavaScript ever executes.",
  },
  {
    title: "Score",
    body: "Server code subtracts visible, capped deductions. The model can explain scores but never set them.",
  },
  {
    title: "Synthesize",
    body: "A Zod-validated JSON report with findings, evidence, Next.js code fixes and a prioritized action plan.",
  },
];
export function HowItWorksSection() {
  return (
    <section className="px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Badge tone="neutral">how the agent works</Badge>
        <h2 className="mt-4 max-w-xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
          A real agent loop, not a prompt with extra steps
        </h2>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-white/[0.07] bg-ink-900/50 p-5"
            >
              <span className="font-mono text-3xl font-bold text-ts-500/50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {step.body}
              </p>
              {i < STEPS.length - 1 ? (
                <ArrowRight
                  className="absolute top-1/2 -right-3.5 hidden size-4 -translate-y-1/2 text-ts-500/60 lg:block"
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SCRIPT = [
  {
    icon: Play,
    color: "text-slate-400",
    label: "Agent is planning the audit",
    detail: "7 tools · budget 8 steps",
  },
  {
    icon: ListChecks,
    color: "text-sev-medium",
    label: "Audit plan ready — selecting evidence tools",
  },
  {
    icon: Loader2,
    color: "text-cyan-300",
    label: "Fetching website snapshot",
    detail: "GET / → 200 · 84 KB · 412 ms",
  },
  {
    icon: Wrench,
    color: "text-slate-400",
    label: "Inspecting HTML structure",
    detail: "title present · 1 h1 · 0 duplicate ids",
  },
  {
    icon: Wrench,
    color: "text-slate-400",
    label: "Checking images for missing alt text",
    detail: "12 images · 2 missing alt",
  },
  {
    icon: ShieldCheck,
    color: "text-sev-medium",
    label: "Analyzing security headers",
    detail: "CSP missing · HSTS present",
  },
  {
    icon: Search,
    color: "text-ts-300",
    label: "Running technical SEO checks",
    detail: "9/12 checks pass",
  },
  {
    icon: Sparkles,
    color: "text-cyan-300",
    label: "Generating prioritized recommendations",
  },
  {
    icon: CheckCircle2,
    color: "text-emerald-400",
    label: "Audit report ready",
    detail: "14 findings · overall 74/100",
  },
] as const;

export function MiniAgentTimeline() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible((v) => (v >= SCRIPT.length + 2 ? 0 : v + 1));
    }, 1100);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div>
          <Badge tone="neutral" className="font-mono">
            live trace
          </Badge>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Watch it plan, call tools, and read the results
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            The UI streams sanitized operational events — never hidden reasoning
            — so you can literally see the agent work: which tool it picked,
            what came back, and when it decides to write the report.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-slate-400">
            {[
              "Deterministic tools, Zod-validated arguments",
              "Hard 8-step budget — no infinite loops",
              "Scores computed by code; the AI explains them",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" aria-hidden />{" "}
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-1.5 border-b border-white/6 pb-3">
            <span className="size-2.5 rounded-full bg-sev-critical/70" />
            <span className="size-2.5 rounded-full bg-sev-medium/70" />
            <span className="size-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-2 font-mono text-[10px] text-slate-600">
              agent — activity.log
            </span>
          </div>
          <div className="mt-3 min-h-72 space-y-1.5">
            {SCRIPT.slice(0, Math.min(visible, SCRIPT.length)).map((event) => (
              <div
                key={event.label}
                className="flex items-start gap-2.5 animate-fade-in"
              >
                <event.icon
                  className={cn("mt-0.5 size-3.5 shrink-0", event.color)}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-300">
                    {event.label}
                  </p>
                  {"detail" in event ? (
                    <p className="font-mono text-[10px] text-slate-600">
                      {event.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {visible <= SCRIPT.length ? (
              <span
                className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-ts-400/80"
                aria-hidden
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
export function SecurityNoteSection() {
  return (
    <section className="px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl rounded-2xl border border-emerald-400/[0.14] bg-emerald-400/4 p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <ShieldCheck
                  className="size-3.5 text-emerald-300"
                  aria-hidden
                />{" "}
                SSRF-hardened
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                DNS-resolved IP allowlisting, private-range rejection, per-hop
                redirect re-validation, strict size & time budgets.
              </p>
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <KeyRound className="size-3.5 text-emerald-300" aria-hidden />{" "}
                Server-held keys
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                The AI key never reaches the browser. No cookies are forwarded,
                no remote JavaScript executes.
              </p>
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <EyeOff className="size-3.5 text-emerald-300" aria-hidden /> No
                chain-of-thought
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                The timeline exposes operational status only. Hidden reasoning
                never leaves the agent loop.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
