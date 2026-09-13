"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Download,
  FileJson,
  FlaskConical,
  ListChecks,
  RotateCcw,
  SearchX,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { AuditReport, Finding } from "@/features/audit/resport-schema";
import type { AuditCategory, Severity } from "@/features/audit/types";
import { auditReportToMarkdown } from "@/features/audit/markdown";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, ScoreRing, scoreTone } from "@/components/ui";
import { CATEGORY_META, SEVERITY_META } from "./category-meta";

function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/4 px-2 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/9 hover:text-white"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? (
        <Check className="size-3 text-emerald-400" aria-hidden />
      ) : (
        <ClipboardCopy className="size-3" aria-hidden />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const meta = CATEGORY_META[finding.category];
  const Icon = meta.icon;
  const sev = SEVERITY_META[finding.severity];

  return (
    <Card
      className="animate-fade-up overflow-hidden p-5 sm:p-6"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={sev.tone}>{sev.label}</Badge>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium"
          style={{ color: meta.color }}
        >
          <Icon className="size-3.5" aria-hidden /> {meta.label}
        </span>

        <span className="ml-auto">
          <Badge tone={finding.source === "deterministic" ? "ts" : "neutral"}>
            {finding.source === "deterministic"
              ? "Deterministic check"
              : "AI synthesis"}
          </Badge>
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold text-white">
        {finding.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
        {finding.description}
      </p>

      {finding.evidence ? (
        <div className="mt-4">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Evidence
          </p>

          <pre className="slim-scroll overflow-x-auto rounded-lg border border-white/[0.07] bg-ink-950/90 p-3 font-mono text-xs leading-relaxed text-cyan-200/90 whitespace-pre-wrap wrap-break-word">
            {finding.evidence}
          </pre>
        </div>
      ) : null}

      {finding.affectedElements.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Affected:
          </span>

          {finding.affectedElements.map((el) => (
            <code
              key={el}
              className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-[11px] text-slate-300"
            >
              {el}
            </code>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-emerald-400/12 bg-emerald-400/5 p-4">
        <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
          <Sparkles className="size-3" aria-hidden /> Recommendation
        </p>
        <p className="text-sm leading-relaxed text-slate-300">
          {finding.recommendation}
        </p>
      </div>

      {finding.codeExample ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07]">
          <div className="flex items-center justify-between border-b border-white/6 bg-ink-800/70 px-3 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Code fix
            </span>
            <CopyButton text={finding.codeExample} label="Copy fix" />
          </div>

          <pre className="slim-scroll overflow-x-auto bg-ink-950/90 p-4 font-mono text-xs leading-relaxed text-slate-300">
            {finding.codeExample}
          </pre>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/6">
          <div
            className="h-full rounded-full bg-linear-to-r from-ts-500 to-cyan-400"
            style={{ width: `${Math.round(finding.confidence * 100)}%` }}
          />
        </div>

        <span className="font-mono text-[10px] text-slate-500">
          {Math.round(finding.confidence * 100)}% confidence
        </span>
      </div>
    </Card>
  );
}

const ReportView = ({ report }: { report: AuditReport }) => {
  const [category, setCategory] = useState<AuditCategory | "all">("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return report.findings
      .filter((f) => (category === "all" ? true : f.category === category))
      .filter((f) => (severity === "all" ? true : f.severity === severity))
      .filter((f) =>
        q === ""
          ? true
          : `${f.title} ${f.description} ${f.evidence}`
              .toLowerCase()
              .includes(q),
      )
      .sort(
        (a, b) =>
          SEVERITY_META[a.severity].order - SEVERITY_META[b.severity].order,
      );
  }, [report.findings, category, severity, query]);

  const slug = new URL(report.finalUrl).hostname.replace(/\W+/g, "-");

  return (
    <div className="space-y-10">
      {/* Report Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {report.demoMode ? (
              <Badge tone="medium" className="gap-1">
                <FlaskConical className="size-3" aria-hidden /> Demo report
              </Badge>
            ) : null}
            <Badge tone="neutral">{report.mode} audit</Badge>
            <Badge
              tone={
                report.performanceDataSource === "measured"
                  ? "success"
                  : "neutral"
              }
            >
              performance: {report.performanceDataSource ?? "not collected"}
              {report.performanceDataSource === "heuristic"
                ? " (heuristic)"
                : ""}
            </Badge>
          </div>

          <h1 className="mt-2 truncate text-xl font-semibold text-white sm:text-2xl">
            {report.finalUrl}
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Generated {new Date(report.generatedAt).toLocaleString()} ·{" "}
            {report.toolsUsed.length} tools executed · model: {report.model}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadFile(
                `sitesage-${slug}.json`,
                JSON.stringify(report, null, 2),
                "application/json",
              );
              toast.success("JSON report downloaded");
            }}
          >
            <FileJson className="size-3.5" aria-hidden /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadFile(
                `sitesage-${slug}.md`,
                auditReportToMarkdown(report),
                "text/markdown",
              );
              toast.success("Markdown report downloaded");
            }}
          >
            <Download className="size-3.5" aria-hidden /> Markdown
          </Button>
          <Link href="/audit">
            <Button variant="primary" size="sm">
              <RotateCcw className="size-3.5" aria-hidden /> New audit
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing
              score={report.overallScore}
              size={150}
              label={report.overallScore === null ? "n/a" : "/ 100"}
            />
            <p className="max-w-56 text-center text-[11px] leading-relaxed text-slate-500">
              {report.disclaimer}
            </p>
          </div>
          <div className="w-full flex-1">
            <p className="text-sm leading-relaxed text-slate-300">
              {report.summary}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {report.categoryScores.map((c) => {
                const meta = CATEGORY_META[c.category];
                const Icon = meta.icon;
                const tone = scoreTone(c.score);

                return (
                  <div
                    key={c.category}
                    className="rounded-xl border border-white/[0.07] bg-ink-900/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                        <Icon
                          className="size-3.5"
                          style={{ color: meta.color }}
                          aria-hidden
                        />{" "}
                        {meta.label}
                      </span>
                      <Badge tone={tone}>
                        {c.evaluated && c.score !== null ? c.score : "n/a"}
                      </Badge>
                    </div>
                    {c.evaluated && c.score !== null ? (
                      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/6">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${c.score}%`,
                            background: meta.color,
                          }}
                        />
                      </div>
                    ) : null}

                    <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-500">
                      {c.summary}
                    </p>

                    {c.deductions.length > 0 ? (
                      <ul className="mt-2 space-y-0.5 border-t border-white/5 pt-2">
                        {c.deductions.slice(0, 3).map((d) => (
                          <li
                            key={d.label}
                            className="flex justify-between gap-2 font-mono text-[10px] text-slate-500"
                          >
                            <span className="truncate">{d.label}</span>
                            {d.points > 0 ? (
                              <span className="text-sev-high">-{d.points}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <section aria-label="Findings">
        <div className="flex flex-col gap-3">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter by category"
          >
            {(
              ["all", ...Object.keys(CATEGORY_META)] as Array<
                AuditCategory | "all"
              >
            ).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "focus-ring rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  category === c
                    ? "border-ts-400/60 bg-ts-500/15 text-ts-200"
                    : "border-white/10 bg-white/3 text-slate-400 hover:text-white",
                )}
              >
                {c === "all" ? "All categories" : CATEGORY_META[c].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Filter by severity"
            >
              {(
                ["all", "critical", "high", "medium", "low", "info"] as Array<
                  Severity | "all"
                >
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={cn(
                    "focus-ring rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
                    severity === s
                      ? "bg-white/12 text-white"
                      : "text-slate-500 hover:text-slate-300",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="relative ml-auto w-full sm:w-64">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search findings…"
                aria-label="Search findings"
                className="focus-ring h-9 w-full rounded-lg border border-white/10 bg-ink-900/80 pr-3 pl-8 text-xs text-slate-200 placeholder:text-slate-600"
              />

              <SearchX
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-600"
                aria-hidden
              />
            </div>
          </div>
        </div>

        <p className="mt-4 font-mono text-[11px] text-slate-500">
          {filtered.length} of {report.findings.length} findings
        </p>

        <div className="mt-4 grid gap-4">
          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-slate-500">
              No findings match the current filters.
            </Card>
          ) : (
            filtered.map((f, i) => (
              <FindingCard key={f.id} finding={f} index={i} />
            ))
          )}
        </div>
      </section>

      <section aria-label="Prioritized action plan">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ListChecks className="size-5 text-ts-300" aria-hidden />{" "}
            Prioritized action plan
          </h2>

          <CopyButton
            text={report.prioritizedActionPlan
              .map(
                (a) =>
                  `${a.priority}. ${a.title} (impact: ${a.impact}, effort: ${a.effort})\n${a.steps.map((s, i) => `   ${i + 1}. ${s}`).join("\n")}`,
              )
              .join("\n\n")}
            label="Copy plan"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {report.prioritizedActionPlan.map((action) => (
            <Card key={action.priority} className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ts-500/20 font-mono text-sm font-bold text-ts-200">
                  {action.priority}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">
                    {action.title}
                  </h3>
                  <div className="mt-1.5 flex gap-1.5">
                    <Badge
                      tone={
                        action.impact === "high"
                          ? "success"
                          : action.impact === "medium"
                            ? "medium"
                            : "neutral"
                      }
                    >
                      impact {action.impact}
                    </Badge>

                    <Badge tone="neutral">effort {action.effort}</Badge>
                  </div>
                </div>
              </div>

              <ol className="mt-3 space-y-1.5 border-t border-white/6 pt-3">
                {action.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-xs leading-relaxed text-slate-400"
                  >
                    <ArrowRight
                      className="mt-0.5 size-3 shrink-0 text-ts-400/70"
                      aria-hidden
                    />{" "}
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <ThumbsUp className="size-4 text-emerald-400" aria-hidden />{" "}
            Positive observations
          </h2>
          <ul className="mt-3 space-y-2">
            {report.positiveObservations.map((p) => (
              <li
                key={p}
                className="flex gap-2 text-sm leading-relaxed text-slate-400"
              >
                <Check
                  className="mt-0.5 size-3.5 shrink-0 text-emerald-400"
                  aria-hidden
                />{" "}
                {p}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <TriangleAlert className="size-4 text-sev-medium" aria-hidden />{" "}
            Limitations
          </h2>
          <ul className="mt-3 space-y-2">
            {report.limitations.map((l) => (
              <li
                key={l}
                className="flex gap-2 text-sm leading-relaxed text-slate-400"
              >
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sev-medium/70"
                  aria-hidden
                />{" "}
                {l}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ReportView;
