import "server-only";
import type OpenAI from "openai";
import { getAiClient, getModelName } from "@/lib/ai-client";
import { AppError, toSafeErrorPayload } from "@/lib/errors";
import { AUDIT_LIMITS } from "@/features/audit/types";
import { normalizeUrl } from "@/features/audit/url-security";
import { computeCategoryScores } from "@/features/audit/scoring";
import { generateDeterministicFindings } from "@/features/audit/findings";
import { composeAuditReport } from "@/features/audit/report";
import {
  modelReportSchema,
  type ModelReport,
} from "@/features/audit/report-schema";
import { executeAgentTool, type AgentToolContext } from "@/features/tools";
import {
  buildReportPrompt,
  buildRepairPrompt,
  buildSystemPrompt,
} from "./instructions";
import {
  AGENT_TOOLS,
  TOOLS_BY_MODE,
  toChatCompletionTools,
  type ToolName,
} from "./schemas";
import {
  emitEvent,
  getRun,
  startTool,
  finishTool,
  type AuditRun,
} from "./run-store";
import { runDemoAgent } from "./demo";
import { sleep } from "@/lib/utils";

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function executeAuditRun(runId: string): Promise<void> {
  const run = getRun(runId);
  if (!run) return;

  try {
    if (run.demoMode) {
      await runDemoAgent(run);
      return;
    }
    const client = getAiClient();
    if (!client)
      throw new AppError(
        "AI_UNAVAILABLE",
        "The AI provider is not configured.",
      );
    await runRealAgent(run, client);
  } catch (error) {
    run.status = "failed";
    run.error = toSafeErrorPayload(error);
    emitEvent(run, "run.failed", run.error.message);
  }
}

async function runRealAgent(run: AuditRun, client: OpenAI): Promise<void> {
  const auditedUrl = normalizeUrl(run.requestedUrl);
  const allowedTools = AGENT_TOOLS.filter((t) =>
    TOOLS_BY_MODE[run.mode].includes(t.name),
  );

  run.status = "planning";
  emitEvent(run, "run.started", "Agent is planning the audit", {
    detail: `${allowedTools.length} tools available · budget ${AUDIT_LIMITS.MAX_TOOL_STEPS} steps`,
  });
  await sleep(150);

  run.plan = allowedTools.map((t) => t.activityLabel);
  emitEvent(run, "plan.ready", "Audit plan ready — selecting evidence tools");

  const ctx: AgentToolContext = { mode: run.mode, auditedUrl, bundle: {} };
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(run.mode, auditedUrl) },
    {
      role: "user",
      content:
        "Begin the audit. Call the tools you need; I will provide results after each call.",
    },
  ];

  const toolDefs = toChatCompletionTools(allowedTools);

  run.status = "running";
  let stepsUsed = 0;

  for (
    let iteration = 0;
    iteration < AUDIT_LIMITS.MAX_TOOL_STEPS + 2;
    iteration += 1
  ) {
    if (wasCancelled(run)) return;

    const response = await client.chat.completions.create({
      model: getModelName(),
      messages,
      tools: toolDefs,
      tool_choice: "auto",
      temperature: 0.2,
    });

    const message = response.choices[0]?.message;
    if (!message) break;
    messages.push(message as ChatMessage);

    const toolCalls = (message.tool_calls ?? []).filter(
      (c) => c.type === "function",
    );
    if (toolCalls.length === 0) break;

    for (const call of toolCalls) {
      if (wasCancelled(run)) return;

      const name = call.function.name as ToolName;
      const known = allowedTools.some((t) => t.name === name);
      stepsUsed += 1;

      if (!known) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: "UNKNOWN_TOOL",
            hint: "Use only the tools offered for this audit mode.",
          }),
        });
        continue;
      }
      if (stepsUsed > AUDIT_LIMITS.MAX_TOOL_STEPS) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: "BUDGET_EXHAUSTED",
            hint: "Tool budget spent. Stop calling tools.",
          }),
        });

        break;
      }

      let args: unknown = {};

      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: "MALFORMED_ARGUMENTS",
            hint: "Arguments must be valid JSON.",
          }),
        });
        continue;
      }

      const label =
        allowedTools.find((t) => t.name === name)?.activityLabel ??
        `Running ${name}`;
      const record = startTool(run, name);
      emitEvent(run, "tool.started", label, {
        toolName: name,
        detail: `step ${Math.min(stepsUsed, AUDIT_LIMITS.MAX_TOOL_STEPS)}/${AUDIT_LIMITS.MAX_TOOL_STEPS}`,
      });

      try {
        const outcome = await executeAgentTool(name, args, ctx);
        finishTool(
          record,
          outcome.ok ? "completed" : "failed",
          outcome.summary,
        );
        emitEvent(
          run,
          outcome.ok ? "tool.completed" : "tool.failed",
          outcome.summary,
          {
            toolName: name,
            detail:
              record.durationMs !== undefined
                ? `${record.durationMs} ms`
                : undefined,
          },
        );

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(outcome.compact),
        });
      } catch (error) {
        finishTool(record, "failed", "Tool execution failed");
        emitEvent(run, "tool.failed", "Tool execution failed", {
          toolName: name,
        });
        if (name === "fetch_website_snapshot") throw error;
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: "TOOL_FAILED",
            hint: "Continue with the remaining tools.",
          }),
        });
      }
    }

    if (stepsUsed > AUDIT_LIMITS.MAX_TOOL_STEPS) break;
  }
  if (wasCancelled(run)) return;

  run.status = "synthesizing";
  emitEvent(run, "report.generating", "Generating prioritized recommendations");
  const scores = computeCategoryScores(ctx.bundle);
  const deterministicFindings = generateDeterministicFindings(ctx.bundle);

  messages.push({
    role: "user",
    content: buildReportPrompt({
      mode: run.mode,
      auditedUrl,
      scores,
      deterministicFindings,
      performanceSource: ctx.bundle.performance?.source ?? null,
    }),
  });

  const modelOutput = await requestStructuredReport(client, messages);

  const report = composeAuditReport({
    runId: run.id,
    auditedUrl,
    finalUrl: ctx.bundle.snapshot?.finalUrl ?? auditedUrl,
    mode: run.mode,
    demoMode: false,
    model: getModelName(),
    modelOutput,
    deterministicFindings,
    scores,
    toolsUsed: run.tools.map((t) => ({
      name: t.name,
      status: t.status === "failed" ? "failed" : "completed",
      durationMs: t.durationMs ?? 0,
    })),
    performanceDataSource: ctx.bundle.performance?.source ?? null,
  });

  run.report = report;
  run.status = "completed";
  emitEvent(run, "report.completed", "Audit report ready", {
    detail: `${report.findings.length} findings · overall ${report.overallScore ?? "n/a"}/100`,
  });
}

function wasCancelled(run: AuditRun): boolean {
  return run.status === "failed";
}

async function requestStructuredReport(
  client: OpenAI,
  messages: ChatMessage[],
): Promise<ModelReport> {
  const dialog = [...messages];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const request = {
      model: getModelName(),
      messages: dialog,
      temperature: 0.3,
    };

    let content: string | null | undefined;

    try {
      const res = await client.chat.completions.create({
        ...request,
        response_format: { type: "json_object" },
      });

      const content = res.choices[0]?.message?.content;
    } catch {
      const res = await client.chat.completions.create(request);
      content = res.choices[0]?.message?.content;
    }

    const json = extractJsonObject(content ?? "");
    if (json) {
      let parsedJson: unknown = null;
      try {
        parsedJson = JSON.parse(json);
      } catch {
        parsedJson = null;
      }

      if (parsedJson !== null) {
        const validated = modelReportSchema.safeParse(parsedJson);
        if (validated.success) return validated.data;
        if (attempt === 0) {
          dialog.push({ role: "assistant", content: json.slice(0, 12_000) });
          dialog.push({
            role: "user",
            content: buildRepairPrompt(
              validated.error.issues.map(
                (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
              ),
            ),
          });
          continue;
        }
      }
    }

    if (attempt === 0) {
      dialog.push({
        role: "user",
        content: buildRepairPrompt([
          "Response was not a single valid JSON object.",
        ]),
      });
    }
  }

  throw new AppError(
    "AI_INVALID_OUTPUT",
    "The AI returned a report that failed validation twice. Please run the audit again.",
  );
}

export function extractJsonObject(text: string): string | null {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return unfenced.slice(start, end + 1);
}
