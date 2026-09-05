/**
 * Shared audit-domain types and hard safety limits.
 * These values are the agent's "budget" — they are enforced in code,
 * never delegated to the model.
 */

export const AUDIT_LIMITS = {
  /** Absolute cap on tool executions per run — prevents infinite agent loops. */
  MAX_TOOL_STEPS: 8,
  /** Only one website may be audited per run. */
  MAX_AUDITED_URLS: 1,
  FETCH_TIMEOUT_MS: 10_000,
  MAX_REDIRECTS: 5,
  /** Downloaded HTML is capped at 1 MB and flagged when truncated. */
  MAX_HTML_BYTES: 1_048_576,
  MAX_LINKS_ANALYZED: 120,
  /** Broken-link probing is sampled, concurrency-limited and re-validated. */
  MAX_LINK_CHECKS: 10,
  LINK_CHECK_TIMEOUT_MS: 4_000,
  LINK_CHECK_CONCURRENCY: 4,
  MAX_FINDINGS_PER_CATEGORY: 8,
  MAX_TOTAL_FINDINGS: 24,
  MAX_ACTION_ITEMS: 8,
} as const;

export const AUDIT_MODES = ["quick", "full", "seo", "accessibility"] as const;
export type AuditMode = (typeof AUDIT_MODES)[number];

export const AUDIT_MODE_LABELS: Record<AuditMode, string> = {
  quick: "Quick Audit",
  full: "Full Audit",
  seo: "SEO Only",
  accessibility: "Accessibility Only",
};

/** Deterministic evidence collected by fetch_website_snapshot. */
export interface WebsiteSnapshot {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  responseTimeMs: number;
  /** Lower-cased response headers. */
  headers: Record<string, string>;
  /** HTML, capped at AUDIT_LIMITS.MAX_HTML_BYTES. */
  html: string;
  htmlTruncated: boolean;
  pageSizeBytes: number;
  redirectCount: number;
  fetchedAt: string;
}

export type AuditCategory =
  | "seo"
  | "accessibility"
  | "performance"
  | "security"
  | "html";

export const AUDIT_CATEGORIES: readonly AuditCategory[] = [
  "seo",
  "accessibility",
  "performance",
  "security",
  "html",
] as const;

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export const SEVERITIES: readonly Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};
