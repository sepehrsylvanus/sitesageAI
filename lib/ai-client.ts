import "server-only";
import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";

let client: OpenAI | null | undefined;

export function getAiClient(): OpenAI | null {
  if (client !== undefined) return client;

  const env = getServerEnv();
  if (!env.openaiApiKey) {
    client = null;
    return client;
  }

  client = new OpenAI({
    apiKey: env.openaiApiKey,
    baseURL: env.openaiBaseUrl,
    timeout: 180_000,
    maxRetries: 1,
  });
  return client;
}

export function getModelName(): string {
  return getServerEnv().openaiModel;
}
