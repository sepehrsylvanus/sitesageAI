import { z } from "zod";
import { AUDIT_LIMITS, AUDIT_MODES } from "./types";

export const severitySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

export const categorySchema = z.enum([
  "seo",
  "accessibility",
  "performance",
  "security",
  "html",
]);

export const findingSchema = z.object({
  id: z.string().min(1).max(64),
  category: categorySchema,
  severity: severitySchema,
  title: z.string().min(4).max(160),
  description: z.string().min(10).max(1500),
  evidence: z.string().max(1500),
  recommendation: z.string().min(10).max(1500),
  codeExample: z.string().max(2400).nullable(),
  confidence: z.number().min(0).max(1),
  source: z.enum(["deterministic", "ai"]),
  affectedElements: z.array(z.string().max(240)).max(5),
});

export const prioritizedActionSchema = z.object({
  priority: z.number().int().min(1).max(99),
  title: z.string().min(4).max(160),
  impact: z.enum(["high", "medium", "low"]),
  effort: z.enum(["high", "medium", "low"]),
  steps: z.array(z.string().min(2).max(320)).min(1).max(6),
});

export const modelFindingSchema = findingSchema.omit({ source: true });

export const modelReportSchema = z.object({
  summary: z.string().min(40).max(1400),
  /** Free-text per-category commentary; scores are NOT part of this.
   *  Lenient record: unknown keys are ignored at compose time. */
  categorySummaries: z.record(z.string().max(40), z.string().max(500)),
  findings: z
    .array(modelFindingSchema)
    .max(AUDIT_LIMITS.MAX_TOTAL_FINDINGS * 2),
  prioritizedActionPlan: z
    .array(prioritizedActionSchema)
    .max(AUDIT_LIMITS.MAX_ACTION_ITEMS * 2),
  positiveObservations: z.array(z.string().min(5).max(320)).max(10),
  limitations: z.array(z.string().min(5).max(320)).max(8),
});

export type ModelReport = z.infer<typeof modelReportSchema>;
export type ModelFinding = z.infer<typeof modelFindingSchema>;

export const scoreDeductionSchema = z.object({
  label: z.string().max(200),
  points: z.number().min(0).max(100),
});

export const categoryScoreSchema = z.object({
  category: categorySchema,
  evaluated: z.boolean(),
  /** Null when the audit mode did not collect evidence for this category. */
  score: z.number().min(0).max(100).nullable(),
  summary: z.string().max(500),
  deductions: z.array(scoreDeductionSchema).max(20),
});

export const toolUsageSchema = z.object({
  name: z.string().max(64),
  status: z.enum(["completed", "failed"]),
  durationMs: z.number().min(0),
});

export const auditReportSchema = z.object({
  id: z.string().min(8).max(64),
  auditedUrl: z.url(),
  finalUrl: z.url(),
  generatedAt: z.iso.datetime(),
  mode: z.enum(AUDIT_MODES),
  demoMode: z.boolean(),
  model: z.string(),
  summary: z.string().max(1400),
  overallScore: z.number().min(0).max(100).nullable(),
  categoryScores: z.array(categoryScoreSchema).length(5),
  findings: z.array(findingSchema).max(AUDIT_LIMITS.MAX_TOTAL_FINDINGS),
  prioritizedActionPlan: z
    .array(prioritizedActionSchema)
    .max(AUDIT_LIMITS.MAX_ACTION_ITEMS),
  positiveObservations: z.array(z.string().max(320)).max(10),
  limitations: z.array(z.string().max(320)).max(8),
  toolsUsed: z.array(toolUsageSchema).max(16),
  performanceDataSource: z.enum(["measured", "heuristic"]).nullable(),
  disclaimer: z.string().max(400),
});

export type AuditReport = z.infer<typeof auditReportSchema>;
export type ToolUsageEntry = z.infer<typeof toolUsageSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type CategoryScore = z.infer<typeof categoryScoreSchema>;
export type PrioritizedAction = z.infer<typeof prioritizedActionSchema>;
