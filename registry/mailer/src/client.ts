import { EmailSendError, EmailValidationError } from "./errors";
import type {
  EmailAdapter,
  EmailMessage,
  EmailPlugin,
  ResolvedSendOptions,
  SendOptions,
  SendResult,
} from "./types";

export interface MailerConfig {
  /** First adapter is primary; the rest are fallback routes, tried in order. */
  adapters: EmailAdapter[];
  plugins?: EmailPlugin[];
  /** Retries per adapter before falling back (default 2). */
  retries?: number;
  /** Backoff before each retry (default exponential, capped at 30s). */
  backoff?: (attempt: number) => number;
}

export interface Mailer {
  send(message: EmailMessage, options?: SendOptions): Promise<SendResult>;
}

const defaultBackoff = (attempt: number) => Math.min(1000 * 2 ** (attempt - 1), 30_000);

const sleep = (ms: number) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

function validateMessage(message: EmailMessage): void {
  if (!message.from) throw new EmailValidationError("`from` is required");
  if (!message.to || (Array.isArray(message.to) && message.to.length === 0)) {
    throw new EmailValidationError("`to` is required");
  }
  if (!message.subject) throw new EmailValidationError("`subject` is required");
  if (!message.html && !message.text) {
    throw new EmailValidationError("provide `html` or `text`");
  }
}

export function createMailer(config: MailerConfig): Mailer {
  const plugins = config.plugins ?? [];
  const retries = config.retries ?? 2;
  const backoff = config.backoff ?? defaultBackoff;

  // Observer hooks never block or break a send — failures are swallowed.
  async function notify<E>(
    pick: (plugin: EmailPlugin) => ((event: E) => unknown) | undefined,
    event: E,
  ): Promise<void> {
    await Promise.allSettled(
      plugins.map(async (plugin) => {
        const fn = pick(plugin);
        if (!fn) return;
        try {
          await fn.call(plugin, event);
        } catch {
          // a broken logger must not mask a provider failure
        }
      }),
    );
  }

  return {
    async send(message: EmailMessage, options: SendOptions = {}): Promise<SendResult> {
      if (config.adapters.length === 0) {
        throw new EmailSendError("no adapters configured");
      }

      const resolved: ResolvedSendOptions = {
        idempotencyKey: options.idempotencyKey,
        metadata: { ...options.metadata },
      };

      // beforeSend runs sequentially; each plugin may replace the message.
      let current = message;
      for (const plugin of plugins) {
        if (!plugin.beforeSend) continue;
        const next = await plugin.beforeSend({ message: current, options: resolved });
        if (next) current = next;
      }

      validateMessage(current);

      let lastError: Error | undefined;
      for (const adapter of config.adapters) {
        let attempt = 0;
        while (true) {
          attempt += 1;
          try {
            const response = await adapter.send(current, resolved);
            await notify((p) => p.afterSend, {
              provider: adapter.name,
              attempt,
              message: current,
              options: resolved,
              response,
            });
            return response;
          } catch (caught) {
            const error = caught instanceof Error ? caught : new Error(String(caught));
            lastError = error;

            // Validation errors are deterministic — retrying/falling back won't help.
            if (error instanceof EmailValidationError) throw error;

            if (attempt <= retries) {
              const delayMs = backoff(attempt);
              await notify((p) => p.onRetry, {
                provider: adapter.name,
                attempt,
                nextAttempt: attempt + 1,
                delayMs,
                error,
                message: current,
                options: resolved,
              });
              await sleep(delayMs);
              continue;
            }

            await notify((p) => p.onError, {
              provider: adapter.name,
              attempt,
              error,
              message: current,
              options: resolved,
            });
            break;
          }
        }
      }

      throw new EmailSendError("all email routes failed", {
        cause: lastError,
      });
    },
  };
}
