export type ErrorCode =
  | "INVALID_URL"
  | "BLOCKED_HOST"
  | "FETCH_FAILED"
  | "RESPONSE_TOO_LARGE"
  | "NON_HTML_RESPONSE"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "AI_INVALID_OUTPUT"
  | "RUN_NOT_FOUND"
  | "TOOL_FAILED"
  | "BUDGET_EXHAUSTED"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly httpStatus: number;

  constructor(
    code: ErrorCode,
    userMessage: string,
    options?: { cause?: unknown; httpStatus?: number },
  ) {
    super(
      userMessage,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );

    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage;
    this.httpStatus = options?.httpStatus ?? defaultStatus(code);
  }
}

function defaultStatus(code: ErrorCode): number {
  switch (code) {
    case "INVALID_URL":
    case "BLOCKED_HOST":
    case "NON_HTML_RESPONSE":
    case "RESPONSE_TOO_LARGE":
      return 400;
    case "RATE_LIMITED":
      return 429;
    case "RUN_NOT_FOUND":
      return 404;
    case "AI_UNAVAILABLE":
      return 503;
    default:
      return 500;
  }
}

export interface SafeErrorPayload {
  code: ErrorCode;
  message: string;
}

export function toSafeErrorPayload(error: unknown): SafeErrorPayload {
  if (error instanceof AppError) {
    return { code: error.code, message: error.userMessage };
  }

  return {
    code: "INTERNAL",
    message: "Something went wrong while running the audit. Please try again.",
  };
}
