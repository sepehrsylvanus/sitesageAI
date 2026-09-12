import "server-only";
import { AppError } from "@/lib/errors";
import { AUDIT_LIMITS, type WebsiteSnapshot } from "./types";
import {
  assertPublicHostname,
  normalizeUrl,
  validateRedirectTarget,
} from "./url-security";

const USER_AGENT =
  "SiteSageAI/1.0 (+https://sitesage.app; evidence-based website audit agent)";
const HTML_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

interface LimitedBody {
  text: string;
  bytes: number;
  truncated: boolean;
}

export async function readBodyWithLimit(
  response: Response,
  signal: AbortSignal,
): Promise<LimitedBody> {
  if (!response.body) return { text: "", bytes: 0, truncated: false };

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const chunks: string[] = [];
  let bytes = 0;
  let truncated = false;

  try {
    for (;;) {
      if (signal.aborted)
        throw new AppError(
          "FETCH_FAILED",
          "The website took too long to respond.",
        );
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > AUDIT_LIMITS.MAX_HTML_BYTES) {
        truncated = true;
        bytes = AUDIT_LIMITS.MAX_HTML_BYTES;
        await reader.cancel().catch(() => undefined);
        break;
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  } finally {
    reader.releaseLock();
  }

  return {
    text: chunks.join(""),
    bytes,
    truncated,
  };
}

export async function fetchWebsiteSnapshot(
  rawUrl: string,
): Promise<WebsiteSnapshot> {
  const requestedUrl = normalizeUrl(rawUrl);
  let currentUrl = requestedUrl;
  let redirectCount = 0;
  const started = performance.now();

  for (;;) {
    await assertPublicHostname(new URL(currentUrl).hostname);

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      AUDIT_LIMITS.FETCH_TIMEOUT_MS,
    );

    let response: Response;

    try {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "accept-language": "en-US,en;q=0.8",
          "cache-control": "no-cache",
        },
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof AppError) throw error;
      throw new AppError(
        "FETCH_FAILED",
        "We couldn't reach that website. It may be offline, blocking automated requests, or too slow.",
        { cause: error },
      );
    }

    const location = response.headers.get("location");
    if (REDIRECT_STATUSES.has(response.status) && location) {
      clearTimeout(timer);
      await response.body?.cancel().catch(() => undefined);
      redirectCount += 1;
      if (redirectCount > AUDIT_LIMITS.MAX_REDIRECTS) {
        throw new AppError(
          "FETCH_FAILED",
          "That website redirected too many times.",
        );
      }
      currentUrl = await validateRedirectTarget(location, currentUrl);
      continue;
    }

    const contentType = (
      response.headers.get("content-type") ?? ""
    ).toLowerCase();

    const isHtml = HTML_CONTENT_TYPES.some((type) =>
      contentType.includes(type),
    );

    if (!isHtml) {
      clearTimeout(timer);
      await response.body?.cancel().catch(() => undefined);
      throw new AppError(
        "NON_HTML_RESPONSE",
        `That URL returned "${contentType.split(";")[0] || "unknown content"}" instead of an HTML page, so it can't be audited.`,
      );
    }

    const body = await readBodyWithLimit(response, controller.signal);
    clearTimeout(timer);

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return {
      requestedUrl,
      finalUrl: currentUrl,
      status: response.status,
      contentType,
      responseTimeMs: Math.round(performance.now() - started),
      headers,
      html: body.text,
      htmlTruncated: body.truncated,
      pageSizeBytes: body.bytes,
      redirectCount,
      fetchedAt: new Date().toISOString(),
    };
  }
}
