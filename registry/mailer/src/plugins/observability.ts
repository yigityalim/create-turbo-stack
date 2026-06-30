import type {
  AfterSendEvent,
  EmailMessage,
  EmailPlugin,
  ErrorEvent,
  MaybePromise,
  RedactedEmailMessage,
  RetryEvent,
} from "../types";

export type EmailObservabilityEvent = {
  type: "email.sent" | "email.retry" | "email.error";
  provider: string;
  attempt: number;
  metadata: Record<string, unknown>;
  message: RedactedEmailMessage;
  responseId?: string;
  messageId?: string;
  nextAttempt?: number;
  delayMs?: number;
  error?: { name: string; message: string };
};

export interface ObservabilityOptions {
  id?: string;
  log?: (event: EmailObservabilityEvent) => MaybePromise<void>;
  metric?: (event: EmailObservabilityEvent) => MaybePromise<void>;
  trace?: (event: EmailObservabilityEvent) => MaybePromise<void>;
  /** Replace the default redaction with your own summary shape. */
  redactMessage?: (message: EmailMessage) => RedactedEmailMessage;
}

function count(value: unknown): number {
  if (value === undefined || value === null) return 0;
  return Array.isArray(value) ? value.length : 1;
}

function defaultRedact(message: EmailMessage): RedactedEmailMessage {
  return {
    subject: message.subject,
    toCount: count(message.to),
    ccCount: count(message.cc),
    bccCount: count(message.bcc),
    hasHtml: Boolean(message.html),
    hasText: Boolean(message.text),
    attachmentCount: message.attachments?.length ?? 0,
    tagNames: message.tags?.map((t) => t.name) ?? [],
    metadataKeys: message.metadata ? Object.keys(message.metadata) : [],
  };
}

/** Emit redacted send/retry/error events to any logger, metrics, or tracer. */
export function observabilityPlugin(options: ObservabilityOptions): EmailPlugin {
  const redact = options.redactMessage ?? defaultRedact;

  async function emit(event: EmailObservabilityEvent): Promise<void> {
    await Promise.allSettled(
      [options.log, options.metric, options.trace].map(async (sink) => {
        if (!sink) return;
        try {
          await sink(event);
        } catch {
          // a broken sink must not mask a provider failure
        }
      }),
    );
  }

  return {
    id: options.id ?? "observability",
    async afterSend(event: AfterSendEvent) {
      await emit({
        type: "email.sent",
        provider: event.provider,
        attempt: event.attempt,
        metadata: event.options.metadata,
        message: redact(event.message),
        responseId: event.response.id,
        messageId: event.response.messageId,
      });
    },
    async onRetry(event: RetryEvent) {
      await emit({
        type: "email.retry",
        provider: event.provider,
        attempt: event.attempt,
        metadata: event.options.metadata,
        message: redact(event.message),
        nextAttempt: event.nextAttempt,
        delayMs: event.delayMs,
        error: { name: event.error.name, message: event.error.message },
      });
    },
    async onError(event: ErrorEvent) {
      await emit({
        type: "email.error",
        provider: event.provider,
        attempt: event.attempt,
        metadata: event.options.metadata,
        message: redact(event.message),
        error: { name: event.error.name, message: event.error.message },
      });
    },
  };
}
