import "server-only";
import { randomUUID } from "node:crypto";
import type { AuditMode } from "@/features/audit/types";
import type { AuditReport } from "@/features/audit/resport-schema";
import type { SafeErrorPayload } from "@/lib/errors";
import type {
  AgentEvent,
  AgentEventType,
  AuditRunSnapshot,
  RunStatus,
  ToolCallRecord,
} from "./events";

export interface AuditRun {
  id: string;
  mode: AuditMode;
  requestedUrl: string;
  status: RunStatus;
  demoMode: boolean;
  createdAtMs: number;
  events: AgentEvent[];
  plan: string[];
  tools: ToolCallRecord[];
  report?: AuditReport;
  error?: SafeErrorPayload;
}

const TTL_MS = 30 * 60 * 1000;

const runs: Map<string, AuditRun> =
  (globalThis as { __sitesageRuns?: Map<string, AuditRun> }).__sitesageRuns ??
  new Map();
(globalThis as { __sitesageRuns?: Map<string, AuditRun> }).__sitesageRuns =
  runs;

let nextEventId = 1;

function sweepExpired(now: number): void {
  for (const [id, run] of runs) {
    if (now - run.createdAtMs > TTL_MS) runs.delete(id);
  }
}

export function createRun(
  mode: AuditMode,
  requestedUrl: string,
  demoMode: boolean,
): AuditRun {
  sweepExpired(Date.now());

  const run: AuditRun = {
    id: randomUUID().replaceAll("-", "").slice(0, 20),
    mode,
    requestedUrl,
    status: "queued",
    demoMode,
    createdAtMs: Date.now(),
    events: [],
    plan: [],
    tools: [],
  };

  runs.set(run.id, run);
  return run;
}

export function getRun(id: string): AuditRun | null {
  sweepExpired(Date.now());

  return runs.get(id) ?? null;
}

export function cancelRun(id: string): boolean {
  const run = runs.get(id);
  if (!run || run.status === "completed" || run.status === "failed")
    return false;

  run.status = "failed";
  run.error = { code: "INTERNAL", message: "The audit was cancelled." };

  emitEvent(run, "run.failed", "Audit cancelled");

  return true;
}

export function emitEvent(
  run: AuditRun,
  type: AgentEventType,
  label: string,
  options?: { detail?: string; toolName?: string },
): void {
  run.events.push({
    id: nextEventId++,
    type,
    at: new Date().toISOString(),
    label,
    detail: options?.detail,
    toolName: options?.toolName,
  });

  if (run.events.length > 120) run.events.splice(0, run.events.length - 120);
}

export function startTool(run: AuditRun, name: string): ToolCallRecord {
  const record: ToolCallRecord = {
    name,
    status: "running",
    startedAt: new Date().toISOString(),
  };

  run.tools.push(record);

  return record;
}

export function finishTool(
  record: ToolCallRecord,
  status: "completed" | "failed",
  summary: string,
): void {
  record.status = status;
  record.summary = summary;
  record.durationMs = Date.now() - new Date(record.startedAt).getTime();
}

export function toRunSnapshot(run: AuditRun): AuditRunSnapshot {
  return {
    id: run.id,
    mode: run.mode,
    requestedUrl: run.requestedUrl,
    status: run.status,
    demoMode: run.demoMode,
    createdAt: new Date(run.createdAtMs).toISOString(),
    events: run.events,
    plan: run.plan,
    tools: run.tools,
    report: run.report,
    error: run.error,
  };
}
