import { sgMail } from "./client";

// Error name union matching email/resend — callers can handle errors uniformly across providers.
export type EmailErrorName =
  | "invalid_api_key"
  | "not_allowed" // sender domain/address not verified in SendGrid
  | "validation_error"
  | "missing_required_field"
  | "rate_limit_exceeded"
  | "network_error"
  | (string & {});

export interface EmailError {
  name: EmailErrorName;
  message: string;
  statusCode: number;
}

// Result types — identical shape to email/resend. Swap providers, keep callers unchanged.
export interface SendEmailSuccess {
  success: true;
  id: string;
}

export interface SendEmailFailure {
  success: false;
  error: EmailError;
}

export type SendEmailResult = SendEmailSuccess | SendEmailFailure;

/**
 * Email options — identical shape to email/resend for drop-in provider swap.
 *
 * Differences from the Resend variant:
 *   - `react` field is absent: SendGrid does not render React. Render with
 *     email-templates' `render(<Email />)` and pass the resulting `html` string.
 *   - `idempotencyKey` is accepted but silently ignored: SendGrid does not expose
 *     a native idempotency mechanism. See README for workaround options.
 *   - `templateId` + `dynamicTemplateData`: SendGrid dynamic templates (optional).
 *     When `templateId` is set, `html`/`text` are ignored by SendGrid.
 */
export interface SendEmailOptions {
  /** Sender address. Must be verified in SendGrid. Format: "Name <email@domain.com>" or "email@domain.com". */
  from: string;
  /** Recipient address(es). */
  to: string | string[];
  subject: string;

  /** HTML body. Ignored when templateId is set. */
  html?: string;
  /** Plain text body. Ignored when templateId is set. */
  text?: string;

  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;

  /** ISO 8601 timestamp. Schedules delivery (converted to Unix epoch seconds for SendGrid). */
  scheduledAt?: string;

  /**
   * Accepted for interface compatibility with email/resend.
   * SendGrid has no native idempotency key mechanism — this field is silently ignored.
   */
  idempotencyKey?: string;

  // SendGrid-specific extensions (no equivalent in email/resend)

  /** SendGrid dynamic template ID (e.g. "d-xxxxxxxx"). When set, html/text are ignored. */
  templateId?: string;
  /** Data for dynamic template substitution. Only used when templateId is set. */
  dynamicTemplateData?: Record<string, unknown>;

  attachments?: Array<{
    /** Base64-encoded file content. */
    content: string;
    filename: string;
    type?: string;
    disposition?: "attachment" | "inline";
  }>;
}

// SendGrid error shape from the thrown error object
interface SendGridErrorBody {
  errors?: Array<{ message?: string; field?: string; help?: string }>;
}

interface SendGridError extends Error {
  code?: number;
  response?: { body?: SendGridErrorBody };
}

function httpStatusToName(status: number): EmailErrorName {
  if (status === 401) return "invalid_api_key";
  if (status === 403) return "not_allowed";
  if (status === 400) return "validation_error";
  if (status === 429) return "rate_limit_exceeded";
  return "unknown_error";
}

function normalizeError(err: unknown): EmailError {
  if (err instanceof Error) {
    const sgErr = err as SendGridError;
    const statusCode = typeof sgErr.code === "number" ? sgErr.code : 0;

    // Prefer the detailed message from SendGrid's response body
    const bodyErrors = sgErr.response?.body?.errors;
    const message =
      bodyErrors && bodyErrors.length > 0 && bodyErrors[0]?.message
        ? bodyErrors[0].message
        : sgErr.message;

    const name =
      statusCode > 0 ? httpStatusToName(statusCode) : "network_error";
    return { name, message, statusCode };
  }
  return { name: "unknown_error", message: String(err), statusCode: 0 };
}

/**
 * Sends a single transactional email via SendGrid.
 *
 * Never throws — always returns a Result. Check `success` before using `id` or `error`.
 * SendGrid throws on failure; this function catches and normalises all errors.
 *
 * Common errors:
 *   not_allowed (403) — the from address or domain is not verified in SendGrid.
 *   invalid_api_key (401) — check env.SENDGRID_API_KEY.
 *   validation_error (400) — malformed request; inspect error.message for details.
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  try {
    // Build SendGrid message — map common fields to SDK shape.
    // Cast required: MailDataRequired is a discriminated union (html|text|templateId must be string,
    // not undefined). We know at least one will be set at runtime; TypeScript cannot narrow this.
    const msg = {
      to: options.to,
      from: options.from,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo:
        typeof options.replyTo === "string"
          ? options.replyTo
          : options.replyTo?.[0],
      cc: options.cc,
      bcc: options.bcc,
      headers: options.headers,
      // tags.name → categories (SendGrid uses string[] for tracking categories)
      categories: options.tags?.map((t) => t.name),
      // scheduledAt (ISO 8601) → sendAt (Unix epoch seconds)
      sendAt: options.scheduledAt
        ? Math.floor(new Date(options.scheduledAt).getTime() / 1000)
        : undefined,
      // SendGrid dynamic templates
      templateId: options.templateId,
      dynamicTemplateData: options.dynamicTemplateData,
      attachments: options.attachments,
      // idempotencyKey is silently ignored — SendGrid has no native equivalent
    };

    const [response] = await sgMail.send(
      msg as Parameters<typeof sgMail.send>[0],
    );

    // x-message-id is SendGrid's message identifier
    const rawId = response.headers["x-message-id"] as string | undefined;
    const id = rawId ?? `sg-${response.statusCode}`;

    return { success: true, id };
  } catch (err) {
    return { success: false, error: normalizeError(err) };
  }
}
