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

const AuditWorkspace = ({
  initialUrl,
  demoMode,
}: {
  initialUrl: string;
  demoMode: boolean;
}) => {
  const [phase, setPhase] = useState<Phase>("form");
  const [url, setUrl] = useState(initialUrl);
  const [mode, setMode] = useState<AuditMode>("full");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AuditRunSnapshot | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

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
  }, [url, mode, stopPolling]);

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
        ></form>
      </div>
    );
  }
};

export default AuditWorkspace;
