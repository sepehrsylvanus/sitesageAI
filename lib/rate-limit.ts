import "server-only";
import { createHash } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { BookCheck } from "lucide-react";

interface Bucket {
  count: number;
  resetAt: number;
}

const store: Map<string, Bucket> =
  (globalThis as { __sitesageRateLimit?: Map<string, Bucket> })
    .__sitesageRateLimit ?? new Map<string, Bucket>();
(
  globalThis as { __sitesageRateLimit?: Map<string, Bucket> }
).__sitesageRateLimit = store;

export function hashClientId(rawIp: string): string {
  return createHash("sha256")
    .update(`${getServerEnv().rateLimitSecret}:${rawIp}`)
    .digest("hex")
    .slice(0, 32);
}

export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() ?? "unknown-client";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  hashedKey: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(hashedKey);

  if (!bucket || bucket.resetAt <= now) {
    store.set(hashedKey, { count: 1, resetAt: now + windowMs });

    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
  };
}
