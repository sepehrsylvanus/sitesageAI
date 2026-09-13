import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Cpu, Scale, ShieldCheck } from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { Badge, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How SiteSage AI separates deterministic evidence from AI synthesis — scoring, SSRF protection, and agent limits.",
};
const SCORING_ROWS = [
  ["Missing <title>", "SEO −30 / HTML −20", "critical"],
  ["Missing meta description", "SEO −18", "high"],
  ["Image missing alt attribute", "Accessibility −6 each (cap −30)", "high"],
  ["Missing lang on <html>", "Accessibility −15 / HTML −10", "medium"],
  ["Missing Content-Security-Policy", "Security −22", "high"],
  ["Missing Strict-Transport-Security", "Security −18", "medium"],
  ["Missing viewport meta", "HTML −20", "high"],
  ["Duplicate element IDs", "Accessibility/HTML −5 each (cap −15)", "medium"],
  ["HTML document > 400 KB", "Performance −20 (heuristic)", "medium"],
  ["Scripts ≥ 22", "Performance −20 (heuristic)", "medium"],
];

const LIMITS = [
  ["Tool executions per run", "8 (hard budget)"],
  ["Audited URLs per run", "1 (enforced in the executor)"],
  ["HTML download cap", "1 MB, flagged when truncated"],
  ["Fetch timeout", "10 seconds"],
  ["Redirects", "5, each hop re-validated"],
  ["Broken-link probes", "10 sampled links, concurrency 4 (full mode)"],
  ["Findings in report", "8/category, 24 total"],
  ["Rate limit", "5 real audits / 10 min / client"],
];

export default function MethodologyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <Badge tone="ts">methodology</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Deterministic evidence first. AI synthesis second.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
          SiteSage AI is deliberately built so the language model can never
          invent reality: tools produce the only facts, code computes every
          score, and Zod validates every boundary crossing — in both directions.
        </p>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <Bot className="size-5 text-ts-300" aria-hidden /> The agent loop
          </h2>
          <Card className="mt-4 p-6">
            <ol className="space-y-3">
              {[
                [
                  "Plan",
                  "The model receives the target URL, audit mode, and per-mode tool schemas (JSON Schema).",
                ],
                [
                  "Call",
                  "It returns tool calls. Arguments are Zod-validated; unknown or out-of-mode tools are rejected.",
                ],
                [
                  "Execute",
                  "Tools read evidence from the run context (the real fetched snapshot) — never from model-supplied content.",
                ],
                [
                  "Repeat",
                  "Tool results go back into the conversation. Hard cap: 8 executions, plus an iteration failsafe.",
                ],
                [
                  "Synthesize",
                  "A final prompt injects the deterministic score card and requests one JSON object.",
                ],
                [
                  "Validate",
                  "The report is Zod-validated. On schema failure the agent gets exactly one repair retry.",
                ],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-ts-500/20 font-mono text-[11px] font-bold text-ts-200">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-400">
                    <span className="font-semibold text-slate-200">
                      {title}.
                    </span>{" "}
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <Scale className="size-5 text-sev-medium" aria-hidden /> Scoring
            rules
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Every category starts at 100 and subtracts capped, visible
            deductions — the same input always yields the same score. The model
            writes the category summaries, never the numbers.
          </p>

          <Card className="mt-4 overflow-x-auto">
            <table className="w-full min-w-130 text-left text-xs">
              <thead>
                <tr className="border-b border-white/8 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-5 py-3">Signal</th>
                  <th className="px-5 py-3">Deterministic deduction</th>
                  <th className="px-5 py-3">Severity lens</th>
                </tr>
              </thead>

              <tbody>
                {SCORING_ROWS.map(([signal, rule, sev]) => (
                  <tr
                    key={signal}
                    className="border-b border-white/4 last:border-0"
                  >
                    <td className="px-5 py-2.5 font-medium text-slate-300">
                      {signal}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-slate-400">
                      {rule}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-slate-500">
                      {sev}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-3 text-xs text-slate-500">
            Category weights for the overall score: SEO 25% · Accessibility 25%
            · Performance 20% · Security 15% · HTML 15% — renormalized over the
            categories each mode actually evaluates. Scores are automated
            indicators, not certifications.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <ShieldCheck className="size-5 text-emerald-400" aria-hidden />{" "}
            Security model
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              [
                "SSRF protection",
                "http/https only; localhost, private, loopback, link-local, CGNAT and cloud-metadata addresses rejected via DNS resolution; every redirect hop re-validated.",
              ],
              [
                "Fetch hygiene",
                "Controlled User-Agent, no cookie/auth forwarding, 10 s timeout, 1 MB streamed body cap, HTML-only content types, no JavaScript execution.",
              ],
              [
                "Secret handling",
                "The AI key is read from server-only modules and never enters the client bundle. Rate-limit buckets store HMAC-hashed IPs, never raw ones.",
              ],
              [
                "Output safety",
                "Operational events hide prompts and reasoning. Errors are mapped to sanitized payloads; stack traces never reach the browser.",
              ],
            ].map(([title, body]) => (
              <Card key={title} className="p-5">
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {body}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <Cpu className="size-5 text-cyan-300" aria-hidden /> Hard limits &
            cost controls
          </h2>

          <Card className="mt-4 overflow-x-auto">
            <table className="w-full min-w-96 text-left text-xs">
              <tbody>
                {LIMITS.map(([k, v]) => (
                  <tr key={k} className="border-b border-white/4 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-slate-300">
                      {k}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-slate-500">
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-white">
            Measured vs heuristic performance data
          </h2>

          <Card className="mt-4 p-6 text-sm leading-relaxed text-slate-400">
            <p>
              With{" "}
              <code className="font-mono text-cyan-300">
                GOOGLE_PAGESPEED_API_KEY
              </code>{" "}
              set, the performance tool calls Google PageSpeed Insights (mobile
              strategy) and reports real Lighthouse numbers, including CrUX
              field data when Google has it.
            </p>

            <p className="mt-3">
              Without a key, the tool returns{" "}
              <span className="text-slate-200">heuristic signals</span> derived
              from the fetched document — HTML weight, script/stylesheet/image
              counts, response time, resource hints — and every such figure is
              labelled heuristic in the report. Lighthouse scores and Core Web
              Vitals are{" "}
              <span className="text-slate-200">never fabricated</span>.
            </p>
          </Card>
        </section>

        <div className="mt-12 text-center">
          <Link
            href="/audit"
            className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-ts-300 hover:text-ts-200"
          >
            Try the agent on a real URL{" "}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
