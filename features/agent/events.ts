import type { AuditReport } from "@/features/audit/resport-schema";
import type { AuditMode } from "@/features/audit/types";
import type { SafeErrorPayload } from "@/lib/errors";

export type RunStatus =
  | "queued"
  | "planning"
  | "running"
  | "synthesizing"
  | "completed"
  | "failed";

export type AgentEventType =
  | "run.started"
  | "plan.ready"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "report.generating"
  | "report.completed"
  | "run.failed";

export interface AgentEvent {
  id: number;
  type: AgentEventType;
  at: string;
  /** Fixed operational message, e.g. "Inspecting images for missing alt text". */
  label: string;
  /** Small, sanitized detail, e.g. "18 images · 3 missing alt". */
  detail?: string;
  toolName?: string;
}

export interface ToolCallRecord {
  name: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  durationMs?: number;
  /** One-line sanitized outcome shown in the UI. */
  summary?: string;
}

export interface AuditRunSnapshot {
  id: string;
  mode: AuditMode;
  requestedUrl: string;
  status: RunStatus;
  demoMode: boolean;
  createdAt: string;
  events: AgentEvent[];
  plan: string[];
  tools: ToolCallRecord[];
  report?: AuditReport;
  error?: SafeErrorPayload;
}
