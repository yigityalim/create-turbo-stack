import type {
  AfterSendEvent,
  BeforeSendContext,
  EmailMessage,
  EmailPlugin,
  ErrorEvent,
  RetryEvent,
  SendResult,
} from "../types";

export type CaptureEvent =
  | { type: "beforeSend"; message: EmailMessage; metadata: Record<string, unknown> }
  | {
      type: "afterSend";
      provider: string;
      attempt: number;
      response: SendResult;
    }
  | {
      type: "retry";
      provider: string;
      attempt: number;
      nextAttempt: number;
      delayMs: number;
      error: Error;
    }
  | { type: "error"; provider: string; attempt: number; error: Error };

export interface EmailCaptureStore {
  readonly events: CaptureEvent[];
  clear(): void;
}

/** A capture store you can hold a reference to outside the client. */
export function createEmailCaptureStore(): EmailCaptureStore {
  const events: CaptureEvent[] = [];
  return {
    events,
    clear() {
      events.length = 0;
    },
  };
}

/**
 * Record the full (unredacted) send lifecycle into a store, for test
 * assertions. Pass a shared store from `createEmailCaptureStore()` to inspect
 * it directly, or omit it and read `plugin.store`.
 */
export function capturePlugin(
  store: EmailCaptureStore = createEmailCaptureStore(),
): EmailPlugin & { store: EmailCaptureStore } {
  return {
    id: "capture",
    store,
    beforeSend(ctx: BeforeSendContext): undefined {
      store.events.push({
        type: "beforeSend",
        message: ctx.message,
        metadata: ctx.options.metadata,
      });
      return undefined;
    },
    afterSend(event: AfterSendEvent) {
      store.events.push({
        type: "afterSend",
        provider: event.provider,
        attempt: event.attempt,
        response: event.response,
      });
    },
    onRetry(event: RetryEvent) {
      store.events.push({
        type: "retry",
        provider: event.provider,
        attempt: event.attempt,
        nextAttempt: event.nextAttempt,
        delayMs: event.delayMs,
        error: event.error,
      });
    },
    onError(event: ErrorEvent) {
      store.events.push({
        type: "error",
        provider: event.provider,
        attempt: event.attempt,
        error: event.error,
      });
    },
  };
}
