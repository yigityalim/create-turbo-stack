import { ErrorCatalog, type ErrorCode } from "./catalog";

export type AppErrorContext = Record<string, unknown>;

/**
 * Catalog-driven application error. Framework-agnostic — a plain `Error`, not
 * tied to tRPC/HTTP. Map it at the transport edge.
 *
 * Security contract: `detail` and `context` are **never** sent to the client
 * (`toClient`). `toLog` carries them, but run it through the PII `sanitize`
 * before writing.
 */
export class AppError extends Error {
  readonly key: ErrorCode;
  readonly displayCode: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly title: string;
  /** Server-only detail. Never returned to clients. */
  readonly detail?: string;
  /** Structured log context. Sanitize before logging. */
  readonly context?: AppErrorContext;

  constructor(key: ErrorCode, detail?: string, context?: AppErrorContext, cause?: unknown) {
    const def = ErrorCatalog[key];
    super(def.title, cause !== undefined ? { cause } : undefined);
    this.name = "AppError";
    this.key = key;
    this.displayCode = def.code;
    this.status = def.status;
    this.retryable = def.retryable;
    this.title = def.title;
    this.detail = detail;
    this.context = context;
  }

  /** Safe payload for clients — no detail or context. */
  toClient(): {
    code: string;
    key: ErrorCode;
    title: string;
    retryable: boolean;
  } {
    return {
      code: this.displayCode,
      key: this.key,
      title: this.title,
      retryable: this.retryable,
    };
  }

  /** Full payload for logs — pass `context` through `sanitize` before writing. */
  toLog(): {
    name: string;
    key: ErrorCode;
    code: string;
    status: number;
    detail?: string;
    context?: AppErrorContext;
    stack?: string;
  } {
    return {
      name: this.name,
      key: this.key,
      code: this.displayCode,
      status: this.status,
      detail: this.detail,
      context: this.context,
      stack: this.stack,
    };
  }

  static badRequest(detail?: string, context?: AppErrorContext) {
    return new AppError("BAD_REQUEST", detail, context);
  }
  static unauthorized(detail?: string, context?: AppErrorContext) {
    return new AppError("UNAUTHORIZED", detail, context);
  }
  static forbidden(detail?: string, context?: AppErrorContext) {
    return new AppError("FORBIDDEN", detail, context);
  }
  static notFound(detail?: string, context?: AppErrorContext) {
    return new AppError("NOT_FOUND", detail, context);
  }
  static conflict(detail?: string, context?: AppErrorContext) {
    return new AppError("CONFLICT", detail, context);
  }
  static validation(detail?: string, context?: AppErrorContext) {
    return new AppError("VALIDATION", detail, context);
  }
  static rateLimited(detail?: string, context?: AppErrorContext) {
    return new AppError("RATE_LIMITED", detail, context);
  }
  static internal(detail?: string, context?: AppErrorContext, cause?: unknown) {
    return new AppError("INTERNAL", detail, context, cause);
  }
  static unavailable(detail?: string, context?: AppErrorContext) {
    return new AppError("UNAVAILABLE", detail, context);
  }
  static timeout(detail?: string, context?: AppErrorContext) {
    return new AppError("TIMEOUT", detail, context);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Normalize any thrown value into an AppError. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    return new AppError("INTERNAL", error.message, undefined, error);
  }
  return new AppError("INTERNAL", String(error));
}
