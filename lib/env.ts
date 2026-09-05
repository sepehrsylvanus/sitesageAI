import "server-only";
import { z } from "zod";

export const DEFAULT_AI_BASE_URL = "https://api.gapgpt.app/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const serverEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  GOOGLE_PAGESPEED_API_KEY: z.string().min(1).optional(),
  AUDIT_RATE_LIMIT_SECRET: z.string().min(8).optional(),
});

export interface ServerEnv {
  openaiApiKey: string | null;
  openaiBaseUrl: string;
  openaiModel: string;
  pageSpeedApiKey: string | null;
  rateLimitSecret: string;
}

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}`,
    );
  }

  cached = {
    openaiApiKey: parsed.data.OPENAI_API_KEY ?? null,
    openaiBaseUrl: (parsed.data.OPENAI_BASE_URL ?? DEFAULT_AI_BASE_URL).replace(
      /\/+$/,
      "",
    ),
    openaiModel: parsed.data.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
    pageSpeedApiKey: parsed.data.GOOGLE_PAGESPEED_API_KEY ?? null,
    rateLimitSecret:
      parsed.data.AUDIT_RATE_LIMIT_SECRET ?? "sitesage-dev-only-secret",
  };

  return cached;
}

export function isDemoMode(): boolean {
  return getServerEnv().openaiApiKey === null;
}
