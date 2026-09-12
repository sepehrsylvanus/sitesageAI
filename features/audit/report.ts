import { AUDIT_LIMITS, SEVERITY_WEIGHT, type AuditMode } from "./types";
import {
  auditReportSchema,
  type AuditReport,
  type CategoryScore,
  type Finding,
  type ModelReport,
  type PrioritizedAction,
  type ToolUsageEntry,
} from "./report-schema";
import type { CategoryScoreResult } from "./scoring";
import { computeOverallScore } from "./scoring";

export const REPORT_DISCLAIMER =
  "Scores are automated indicators, not certifications. Verify changes against your own context before shipping.";

const NOT_EVALUATED_SUMMARY = "Not evaluated in this audit mode.";

function uniqueIds(findings: Finding[]): Finding[] {
  const seen = new Map<string, number>();
  return findings.map((f) => {
    const count = seen.get(f.id) ?? 0;
    seen.set(f.id, count + 1);
    return count === 0 ? f : { ...f, id: `${f.id}-${count + 1}` };
  });
}

function capFindings(findings: Finding[]): Finding[] {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity],
  );
  const perCategory = new Map<string, number>();
  const kept: Finding[] = [];

  for (const finding of sorted) {
    const count = perCategory.get(finding.category) ?? 0;
    if (count >= AUDIT_LIMITS.MAX_FINDINGS_PER_CATEGORY) continue;
    if (kept.length >= AUDIT_LIMITS.MAX_TOTAL_FINDINGS) break;
    perCategory.set(finding.category, count + 1);
    kept.push(finding);
  }

  return kept;
}

export interface ComposeReportParams {
  runId: string;
  auditedUrl: string;
  finalUrl: string;
  mode: AuditMode;
  demoMode: boolean;
  model: string;
  modelOutput: ModelReport;
  /** Server-authored evidence-based findings (trust level: deterministic). */
  deterministicFindings: Finding[];
  scores: CategoryScoreResult[];
  toolsUsed: ToolUsageEntry[];
  performanceDataSource: "measured" | "heuristic" | null;
}

export function composeAuditReport(params: ComposeReportParams): AuditReport {
  const { modelOutput } = params;

  const aiFindings: Finding[] = modelOutput.findings.map((f) => ({
    ...f,
    affectedElements: f.affectedElements.slice(0, 5),
    codeExample: f.codeExample?.trim() ? f.codeExample : null,
    source: "ai" as const,
  }));

  const findings = capFindings(
    uniqueIds([...params.deterministicFindings, ...aiFindings]),
  );

  const actions: PrioritizedAction[] = [...modelOutput.prioritizedActionPlan]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, AUDIT_LIMITS.MAX_ACTION_ITEMS)
    .map((action, index) => ({ ...action, priority: index + 1 }));

  const categoryScores: CategoryScore[] = params.scores.map((s) => ({
    category: s.category,
    evaluated: s.evaluated,
    score: s.score,
    summary: s.evaluated
      ? (modelOutput.categorySummaries[s.category] ?? "No summary provided.")
      : NOT_EVALUATED_SUMMARY,
    deductions: s.deductions.slice(0, 20),
  }));

  return auditReportSchema.parse({
    id: params.runId,
    auditedUrl: params.auditedUrl,
    finalUrl: params.finalUrl,
    generatedAt: new Date().toISOString(),
    mode: params.mode,
    demoMode: params.demoMode,
    model: params.model,
    summary: modelOutput.summary,
    overallScore: computeOverallScore(params.scores),
    categoryScores,
    findings,
    prioritizedActionPlan: actions,
    positiveObservations: modelOutput.positiveObservations.slice(0, 10),
    limitations: modelOutput.limitations.slice(0, 8),
    toolsUsed: params.toolsUsed.slice(0, 16),
    performanceDataSource: params.performanceDataSource,
    disclaimer: REPORT_DISCLAIMER,
  });
}
