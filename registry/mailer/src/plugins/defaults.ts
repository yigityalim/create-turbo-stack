import type {
  BeforeSendContext,
  EmailAddress,
  EmailHeaders,
  EmailMessage,
  EmailMetadata,
  EmailPlugin,
  EmailTag,
} from "../types";

export interface DefaultsOptions {
  id?: string;
  /** Default headers — merged under per-message headers (message wins). */
  headers?: EmailHeaders;
  /** Default tags — prepended before per-message tags. */
  tags?: EmailTag[];
  /** Default metadata — merged under per-message metadata (message wins). */
  metadata?: EmailMetadata;
  /** Default reply-to — used only when the message has none. */
  replyTo?: EmailAddress | EmailAddress[];
  /** Default idempotency key — used only when message/options have none. */
  idempotencyKey?: string;
  /** Prefix prepended to the key unless it already starts with it. */
  idempotencyKeyPrefix?: string;
}

/** Inject org-wide defaults into every message, with per-message override. */
export function defaultsPlugin(options: DefaultsOptions): EmailPlugin {
  return {
    id: options.id ?? "defaults",
    beforeSend(ctx: BeforeSendContext): EmailMessage {
      const message = ctx.message;

      const merged: EmailMessage = {
        ...message,
        headers: { ...options.headers, ...message.headers },
        tags: [...(options.tags ?? []), ...(message.tags ?? [])],
        metadata: { ...options.metadata, ...message.metadata },
        replyTo: message.replyTo ?? options.replyTo,
      };

      if (!ctx.options.idempotencyKey && options.idempotencyKey) {
        ctx.options.idempotencyKey = options.idempotencyKey;
      }
      const prefix = options.idempotencyKeyPrefix;
      const key = ctx.options.idempotencyKey;
      if (prefix && key && !key.startsWith(prefix)) {
        ctx.options.idempotencyKey = prefix + key;
      }

      return merged;
    },
  };
}
