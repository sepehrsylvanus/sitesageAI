import { z } from "zod";
import { AppError, toSafeErrorPayload } from "@/lib/errors";
import {
  checkRateLimit,
  extractClientIp,
  hashClientId,
} from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/env";
import { normalizeUrl } from "@/features/audit/url-security";
import { AUDIT_MODES } from "@/features/audit/types";
import { createRun } from "@/features/agent/run-store";
import { executeAuditRun } from "@/features/agent/loop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startAuditSchema = z.object({
  url: z.string().min(3).max(2048),
  mode: z.enum(AUDIT_MODES),
});

const WINDOW_MS = 10 * 60 * 1000;
const REAL_LIMIT = 5; // 5 real audits / 10 min / client
const DEMO_LIMIT = 12;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = startAuditSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        "INVALID_URL",
        "Send JSON: { url: string, mode: quick|full|seo|accessibility }.",
      );
    }

    const normalizedUrl = normalizeUrl(parsed.data.url);

    const clientKey = hashClientId(extractClientIp(request));
    const demo = isDemoMode();
    const limit = checkRateLimit(
      `audit:${demo ? "demo" : "real"}:${clientKey}`,
      demo ? DEMO_LIMIT : REAL_LIMIT,
      WINDOW_MS,
    );
    if (!limit.allowed) {
      throw new AppError(
        "RATE_LIMITED",
        `Rate limit reached. Try again in about ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
        { httpStatus: 429 },
      );
    }

    const run = createRun(parsed.data.mode, normalizedUrl, demo);
    void executeAuditRun(run.id);

    return Response.json(
      { runId: run.id, statusUrl: `/api/audit-runs/${run.id}`, demoMode: demo },
      { status: 202 },
    );
  } catch (error) {
    const safe = toSafeErrorPayload(error);
    const status = error instanceof AppError ? error.httpStatus : 500;
    return Response.json({ error: safe }, { status });
  }
}
