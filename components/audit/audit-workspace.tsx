"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accessibility,
  CheckCircle2,
  FileCheck2,
  FlaskConical,
  Gauge,
  Globe,
  ListChecks,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { AuditRunSnapshot } from "@/features/agent/events";
import {
  AUDIT_MODES,
  AUDIT_MODE_LABELS,
  type AuditMode,
} from "@/features/audit/types";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, Input } from "@/components/ui";
import ReportView from "@/components/report/report-view";

const MODE_ICONS: Record<AuditMode, typeof Zap> = {
  quick: Zap,
  full: Globe,
  seo: Search,
  accessibility: Accessibility,
};

const MODE_HINTS: Record<AuditMode, string> = {
  quick: "Snapshot · HTML · SEO · headers — about 30 seconds",
  full: "All 7 tools incl. links, images & performance",
  seo: "Search-focused: tags, social metadata, sitemap, speed",
  accessibility: "Alt text, headings, landmarks, link safety",
};

type Phase = "form" | "running" | "completed" | "failed";

const EVENT_ICON: Record<string, typeof Play> = {
  "run.started": Play,
  "plan.ready": ListChecks,
  "tool.started": Wrench,
  "tool.completed": CheckCircle2,
  "tool.failed": XCircle,
  "report.generating": Sparkles,
  "report.completed": FileCheck2,
  "run.failed": XCircle,
};

function eventColor(type: string): string {
  switch (type) {
    case "tool.completed":
      return "text-emerald-400";
    case "tool.failed":
    case "run.failed":
      return "text-sev-critical";
    case "report.completed":
      return "text-ts-300";
    case "report.generating":
      return "text-cyan-300";
    case "plan.ready":
      return "text-sev-medium";
    default:
      return "text-slate-400";
  }
}

export function AuditWorkspace({
  initialUrl,
  demoMode,
}: {
  initialUrl: string;
  demoMode: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [mode, setMode] = useState<AuditMode>("full");
  const [phase, setPhase] = useState<Phase>("form");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AuditRunSnapshot | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    const el = timelineRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [snapshot?.events.length]);

  const start = useCallback(async () => {
    if (!url.trim()) {
      setSubmitError(
        "Enter a website URL first — for example https://nextjs.org",
      );
      return;
    }
    setSubmitError(null);
    setSnapshot(null);
    setElapsed(0);

    let response: Response;
    try {
      response = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, mode }),
      });
    } catch {
      setSubmitError("Network error — could not reach the audit service.");
      return;
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String(
              (payload as { error: { message?: string } }).error?.message ??
                "Could not start the audit.",
            )
          : "Could not start the audit.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    const { statusUrl } = payload as { statusUrl: string };
    startedAtRef.current = Date.now();
    setPhase("running");

    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(statusUrl, { cache: "no-store" });
        if (!res.ok) return;
        const run = (await res.json()) as AuditRunSnapshot;
        setSnapshot(run);
        if (run.status === "completed") {
          stopPolling();
          setPhase("completed");
          toast.success("Audit complete — report ready");
        } else if (run.status === "failed") {
          stopPolling();
          setPhase("failed");
        }
      } catch {
        // Transient poll errors are ignored; the next tick retries.
      }
    }, 900);
  }, [url, mode, stopPolling]);

  const cancel = useCallback(async () => {
    if (!snapshot) return;
    await fetch(`/api/audit-runs/${snapshot.id}/cancel`, {
      method: "POST",
    }).catch(() => undefined);
  }, [snapshot]);

  const reset = useCallback(() => {
    stopPolling();
    setPhase("form");
    setSnapshot(null);
    setSubmitError(null);
  }, [stopPolling]);

  const progress = useMemo(() => {
    if (!snapshot) return 0;
    const total = Math.max(snapshot.plan.length, 1);
    const done = snapshot.tools.filter((t) => t.status !== "running").length;
    const base = snapshot.status === "synthesizing" ? total : done;
    return Math.min(96, Math.round((base / total) * 100));
  }, [snapshot]);

  if (phase === "form") {
    return (
      <div className="mx-auto max-w-3xl animate-fade-up">
        <div className="text-center">
          <Badge tone="ts" className="mx-auto">
            agent workspace
          </Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Audit a website
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Enter a public URL. The agent will plan, call deterministic tools,
            and synthesize an evidence-backed report — with every step visible
            below.
          </p>
        </div>

        {demoMode ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-sev-medium/25 bg-sev-medium/[0.07] p-4">
            <FlaskConical
              className="mt-0.5 size-4 shrink-0 text-sev-medium"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-sev-medium">
                Demo Mode is active
              </span>{" "}
              — no AI key configured. Audits run against a canned snapshot with
              scripted synthesis, clearly labelled, and no live AI request is
              made. Add{" "}
              <code className="font-mono text-sev-medium">OPENAI_API_KEY</code>{" "}
              (GapGPT or OpenAI) to go live.
            </p>
          </div>
        ) : null}

        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
        >
          <div>
            <label
              htmlFor="audit-url"
              className="mb-2 block font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500"
            >
              Website URL
            </label>
            <div className="relative">
              <Globe
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-600"
                aria-hidden
              />
              <Input
                id="audit-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-site.com"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                className="pl-11"
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Audit mode
            </legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {AUDIT_MODES.map((m) => {
                const Icon = MODE_ICONS[m];
                const selected = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={selected}
                    className={cn(
                      "focus-ring flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                      selected
                        ? "border-ts-400/60 bg-ts-500/[0.12] shadow-[0_0_24px_-6px_rgba(49,120,198,0.5)]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/25",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg",
                        selected
                          ? "bg-ts-500/25 text-ts-200"
                          : "bg-white/[0.06] text-slate-400",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span
                        className={cn(
                          "block text-sm font-semibold",
                          selected ? "text-white" : "text-slate-300",
                        )}
                      >
                        {AUDIT_MODE_LABELS[m]}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                        {MODE_HINTS[m]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {submitError ? (
            <p
              role="alert"
              className="rounded-lg border border-sev-critical/30 bg-sev-critical/10 px-4 py-2.5 text-sm text-sev-critical"
            >
              {submitError}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full">
            <Play className="size-4" aria-hidden /> Start agent audit
          </Button>
          <p className="text-center text-[11px] text-slate-600">
            {demoMode
              ? "Rate limited · canned snapshot in Demo Mode"
              : "Rate limited: 5 real audits / 10 min · SSRF-protected fetching · 8-step tool budget"}
          </p>
        </form>
      </div>
    );
  }

  if (phase === "failed") {
    const message =
      snapshot?.error?.message ?? "The audit failed unexpectedly.";
    return (
      <div className="mx-auto max-w-xl animate-fade-up text-center">
        <XCircle className="mx-auto size-12 text-sev-critical" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-white">
          Audit could not complete
        </h2>
        <p className="mt-3 rounded-xl border border-sev-critical/25 bg-sev-critical/[0.07] p-4 text-sm leading-relaxed text-slate-300">
          {message}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>
            <RotateCcw className="size-4" aria-hidden /> Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPhase("form");
            }}
          >
            Change URL
          </Button>
        </div>
      </div>
    );
  }

  const running = phase === "running";
  const plan = snapshot?.plan ?? [];
  const tools = snapshot?.tools ?? [];

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="border-b border-white/[0.06] bg-ink-900/60 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "relative flex size-2.5",
                running && "animate-pulse-dot",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-2.5 rounded-full",
                  running ? "bg-cyan-400" : "bg-emerald-400",
                )}
              />
            </span>
            <p className="min-w-0 flex-1 truncate font-mono text-sm text-slate-300">
              {snapshot?.requestedUrl ?? url}
            </p>
            <Badge tone={snapshot?.demoMode ? "medium" : "ts"}>
              {snapshot?.demoMode
                ? "Demo run"
                : AUDIT_MODE_LABELS[snapshot?.mode ?? mode]}
            </Badge>
            {running ? (
              <>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {elapsed}s
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void cancel()}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="size-3.5" aria-hidden /> New audit
              </Button>
            )}
          </div>
          <div
            className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                running
                  ? "bg-gradient-to-r from-ts-500 to-cyan-400"
                  : "bg-emerald-400",
              )}
              style={{ width: `${phase === "completed" ? 100 : progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-5">
          {/* Tool cards */}
          <div className="border-b border-white/[0.06] p-5 sm:p-6 lg:col-span-2 lg:border-r lg:border-b-0">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Tool plan
            </p>
            <ul className="space-y-2">
              {plan.map((label) => {
                const record = tools.find((t) => labelMatches(t.name, label));
                const status = record?.status ?? "pending";
                return (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all",
                      status === "running" &&
                        "border-cyan-400/40 bg-cyan-400/[0.06]",
                      status === "completed" &&
                        "border-emerald-400/20 bg-emerald-400/[0.04]",
                      status === "failed" &&
                        "border-sev-critical/30 bg-sev-critical/[0.06]",
                      status === "pending" &&
                        "border-white/[0.06] bg-white/[0.02] opacity-60",
                    )}
                  >
                    {status === "running" ? (
                      <Loader2
                        className="size-4 animate-spin text-cyan-300"
                        aria-hidden
                      />
                    ) : status === "completed" ? (
                      <CheckCircle2
                        className="size-4 text-emerald-400"
                        aria-hidden
                      />
                    ) : status === "failed" ? (
                      <XCircle
                        className="size-4 text-sev-critical"
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="size-4 rounded-full border border-slate-600"
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-slate-200">
                        {label}
                      </span>
                      {record?.summary ? (
                        <span className="block truncate font-mono text-[10px] text-slate-500">
                          {record.summary}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
              {snapshot?.status === "synthesizing" || phase === "completed" ? (
                <li
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                    phase === "completed"
                      ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                      : "border-cyan-400/40 bg-cyan-400/[0.06]",
                  )}
                >
                  {phase === "completed" ? (
                    <CheckCircle2
                      className="size-4 text-emerald-400"
                      aria-hidden
                    />
                  ) : (
                    <Sparkles
                      className="size-4 animate-pulse text-cyan-300"
                      aria-hidden
                    />
                  )}
                  <span className="text-xs font-medium text-slate-200">
                    Synthesizing report
                  </span>
                </li>
              ) : null}
            </ul>
          </div>

          {/* Live event timeline */}
          <div className="p-5 sm:p-6 lg:col-span-3">
            <p className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Agent activity <span>{snapshot?.events.length ?? 0} events</span>
            </p>
            <div
              ref={timelineRef}
              className="slim-scroll h-72 space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] bg-ink-950/70 p-3 lg:h-80"
            >
              {(snapshot?.events ?? []).map((event, idx, arr) => {
                const Icon = EVENT_ICON[event.type] ?? Wrench;
                const isLatest = idx === arr.length - 1 && running;
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2.5 rounded-md px-2 py-1.5 animate-fade-in"
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        eventColor(event.type),
                        isLatest &&
                          event.type === "tool.started" &&
                          "animate-spin",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed text-slate-300">
                        {event.label}
                      </p>
                      {event.detail ? (
                        <p className="truncate font-mono text-[10px] text-slate-600">
                          {event.detail}
                        </p>
                      ) : null}
                    </div>
                    <time className="shrink-0 font-mono text-[10px] text-slate-700">
                      {new Date(event.at).toLocaleTimeString([], {
                        hour12: false,
                      })}
                    </time>
                  </div>
                );
              })}
              {(snapshot?.events.length ?? 0) === 0 ? (
                <p className="px-2 py-6 text-center font-mono text-xs text-slate-600">
                  Booting agent…
                </p>
              ) : null}
            </div>
            <p className="mt-2 text-right font-mono text-[10px] text-slate-700">
              operational events only — no model reasoning is exposed
            </p>
          </div>
        </div>
      </Card>

      {phase === "completed" && snapshot?.report ? (
        <ReportView report={snapshot.report} />
      ) : null}
    </div>
  );
}

function labelMatches(toolName: string, label: string): boolean {
  const map: Record<string, string> = {
    fetch_website_snapshot: "fetch",
    inspect_html_structure: "html structure",
    inspect_images: "images",
    inspect_links: "links",
    inspect_security_headers: "security headers",
    inspect_seo: "seo",
    inspect_performance: "performance",
  };
  return label.toLowerCase().includes(map[toolName] ?? toolName);
}
