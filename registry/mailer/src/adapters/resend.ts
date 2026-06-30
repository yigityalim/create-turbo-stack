import { EmailValidationError } from "../errors";
import type {
  EmailAdapter,
  EmailAddress,
  EmailMessage,
  ResolvedSendOptions,
  SendResult,
} from "../types";

export interface ResendAdapterConfig {
  apiKey: string;
  /** Override the API origin, e.g. for a proxy. */
  baseUrl?: string;
  /** Custom fetch for tests or special runtimes. */
  fetch?: typeof fetch;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
}

function formatAddress(address: EmailAddress): string {
  if (typeof address === "string") return address;
  return address.name ? `${address.name} <${address.email}>` : address.email;
}

function formatAddresses(address: EmailAddress | EmailAddress[]): string | string[] {
  return Array.isArray(address) ? address.map(formatAddress) : formatAddress(address);
}

function toPayload(message: EmailMessage): Record<string, unknown> {
  // Resend has no metadata concept — fail loudly instead of dropping it.
  if (message.metadata && Object.keys(message.metadata).length > 0) {
    throw new EmailValidationError("resend has no metadata field — use tags instead");
  }

  const payload: Record<string, unknown> = {
    from: formatAddress(message.from),
    to: formatAddresses(message.to),
    subject: message.subject,
  };
  if (message.html) payload.html = message.html;
  if (message.text) payload.text = message.text;
  if (message.cc) payload.cc = formatAddresses(message.cc);
  if (message.bcc) payload.bcc = formatAddresses(message.bcc);
  if (message.replyTo) payload.reply_to = formatAddresses(message.replyTo);
  if (message.headers) payload.headers = message.headers;
  if (message.tags) payload.tags = message.tags;
  if (message.attachments) {
    payload.attachments = message.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      content_type: a.contentType,
    }));
  }
  return payload;
}

/** Resend adapter — calls the Resend Email API over `fetch` (no SDK dependency). */
export function resend(config: ResendAdapterConfig): EmailAdapter {
  const baseUrl = config.baseUrl ?? "https://api.resend.com";
  const doFetch = config.fetch ?? fetch;

  return {
    name: "resend",
    async send(message: EmailMessage, options: ResolvedSendOptions): Promise<SendResult> {
      const response = await doFetch(`${baseUrl}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
          ...config.headers,
        },
        body: JSON.stringify(toPayload(message)),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`resend: ${response.status} ${response.statusText} ${detail}`.trim());
      }

      const data = (await response.json()) as { id: string };
      return { id: data.id, provider: "resend", messageId: data.id };
    },
  };
}
