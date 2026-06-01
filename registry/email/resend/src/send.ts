import type {
  CreateEmailOptions,
  CreateBatchOptions,
  ErrorResponse,
} from "resend";
import { resend } from "./client";

// Known Resend API error names. The string fallback keeps completions while allowing unknown names.
export type EmailErrorName =
  | "invalid_api_key"
  | "not_allowed" // domain not verified in Resend dashboard
  | "validation_error"
  | "missing_required_field"
  | "rate_limit_exceeded"
  | "invalid_idempotency_key"
  | "invalid_idempotent_request" // same key + different payload — retry is useless
  | "concurrent_idempotent_requests" // safe to retry after a short delay
  | "network_error" // connection refused, timeout, DNS failure
  | (string & {});

export interface EmailError {
  name: EmailErrorName;
  message: string;
  statusCode: number;
}

export interface SendEmailSuccess {
  success: true;
  id: string;
}

export interface SendEmailFailure {
  success: false;
  error: EmailError;
}

export type SendEmailResult = SendEmailSuccess | SendEmailFailure;

export interface SendEmailOptions {
  /** Sender address. Format: "Name <email@verified-domain.com>". Domain must be verified in Resend. */
  from: string;
  /** Recipient address(es). Max 50 per email. */
  to: string | string[];
  subject: string;

  /** HTML body. */
  html?: string;
  /** Plain text fallback. Auto-generated from html if omitted. */
  text?: string;
  /**
   * React element. Resend renders it server-side — do not call renderToString yourself.
   * Only available in the Node.js SDK. Pass the result of calling your React Email component.
   */
  react?: CreateEmailOptions["react"];

  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
  attachments?: CreateEmailOptions["attachments"];
  /** ISO 8601 timestamp. Schedules delivery. Not supported in batch sends. */
  scheduledAt?: string;

  /**
   * Idempotency key (1–256 characters). Prevents duplicate delivery on retry.
   * Resend stores keys for 24 hours. Recommended format: "event-type/entity-id".
   *
   * 409 invalid_idempotent_request — same key, different payload. Change key or payload before retrying.
   * 409 concurrent_idempotent_requests — parallel request in progress. Safe to retry after a short delay.
   */
  idempotencyKey?: string;
}

// Batch items omit scheduledAt (not supported by batch API) and idempotencyKey (per-batch only).
export type BatchEmailItem = Omit<
  SendEmailOptions,
  "scheduledAt" | "idempotencyKey"
>;

export interface SendBatchSuccess {
  success: true;
  /** Email IDs in the same order as the input array. */
  ids: string[];
}

export interface SendBatchFailure {
  success: false;
  error: EmailError;
}

export type SendBatchResult = SendBatchSuccess | SendBatchFailure;

function normalizeError(err: unknown): EmailError {
  // instanceof Error must come first — Error instances are also "objects" so the
  // generic object branch would otherwise catch them and return err.name === "Error",
  // not "network_error".
  if (err instanceof Error) {
    const anyErr = err as Error & { statusCode?: number; name?: string };
    return {
      // Plain JS errors (network failures, timeouts) have err.name === "Error" —
      // map those to "network_error" for a meaningful caller signal.
      name:
        anyErr.name === "Error"
          ? "network_error"
          : ((anyErr.name as EmailErrorName) ?? "network_error"),
      message: anyErr.message,
      statusCode: typeof anyErr.statusCode === "number" ? anyErr.statusCode : 0,
    };
  }
  if (err !== null && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return {
      name:
        typeof e["name"] === "string"
          ? (e["name"] as EmailErrorName)
          : "unknown_error",
      message:
        typeof e["message"] === "string" ? e["message"] : JSON.stringify(err),
      statusCode: typeof e["statusCode"] === "number" ? e["statusCode"] : 0,
    };
  }
  return { name: "unknown_error", message: String(err), statusCode: 0 };
}

/**
 * Sends a single transactional email via Resend.
 *
 * Never throws — always returns a Result. Inspect `success` before using `id` or `error`.
 *
 * Common errors:
 *   not_allowed — the from domain is not verified in the Resend dashboard.
 *   rate_limit_exceeded — retry with exponential backoff using the same idempotencyKey.
 *   network_error — connection failure; safe to retry with the same idempotencyKey.
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const { idempotencyKey, ...emailOptions } = options;

  try {
    // Cast required: CreateEmailOptions is a discriminated union; TypeScript cannot narrow
    // optional body fields (html/text/react) to a specific variant automatically.
    const { data, error } = await resend.emails.send(
      emailOptions as CreateEmailOptions,
      idempotencyKey !== undefined ? { idempotencyKey } : undefined,
    );

    if (error) {
      return { success: false, error: normalizeError(error as ErrorResponse) };
    }
    if (!data) {
      return {
        success: false,
        error: {
          name: "unknown_error",
          message: "Empty response from Resend",
          statusCode: 0,
        },
      };
    }

    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: normalizeError(err) };
  }
}

/**
 * Sends up to 100 emails in a single API call (one HTTP round-trip).
 *
 * Batch limitations: attachments and scheduledAt are not supported.
 * Use sendEmail individually for those.
 *
 * The idempotencyKey covers the entire batch. Recommended format: "batch-event/batch-id".
 */
export async function sendBatchEmail(
  emails: BatchEmailItem[],
  options?: { idempotencyKey?: string },
): Promise<SendBatchResult> {
  if (emails.length === 0) {
    return { success: true, ids: [] };
  }
  if (emails.length > 100) {
    return {
      success: false,
      error: {
        name: "validation_error",
        message: `Batch size ${emails.length} exceeds the maximum of 100. Split into smaller batches.`,
        statusCode: 400,
      },
    };
  }

  try {
    const { data, error } = await resend.batch.send(
      emails as CreateBatchOptions,
      options?.idempotencyKey !== undefined
        ? { idempotencyKey: options.idempotencyKey }
        : undefined,
    );

    if (error) {
      return { success: false, error: normalizeError(error as ErrorResponse) };
    }
    if (!data) {
      return {
        success: false,
        error: {
          name: "unknown_error",
          message: "Empty response from Resend",
          statusCode: 0,
        },
      };
    }

    // The Resend SDK wraps the batch response in a { data: [...] } envelope.
    const envelope = data as unknown as { data: Array<{ id: string }> };
    return { success: true, ids: envelope.data.map((item) => item.id) };
  } catch (err) {
    return { success: false, error: normalizeError(err) };
  }
}
