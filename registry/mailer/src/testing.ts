import type { EmailAdapter, EmailMessage, ResolvedSendOptions, SendResult } from "./types";

export interface MemoryRecord {
  message: EmailMessage;
  options: ResolvedSendOptions;
}

export interface MemoryAdapter extends EmailAdapter {
  readonly sent: MemoryRecord[];
  clear(): void;
}

/** In-memory adapter — records sends and returns a fake id, no network. */
export function memoryProvider(): MemoryAdapter {
  const sent: MemoryRecord[] = [];
  let counter = 0;
  return {
    name: "memory",
    sent,
    clear() {
      sent.length = 0;
    },
    async send(message: EmailMessage, options: ResolvedSendOptions): Promise<SendResult> {
      sent.push({ message, options });
      counter += 1;
      const id = `mem_${counter}`;
      return { id, provider: "memory", messageId: id };
    },
  };
}

/** Adapter that fails its first `failTimes` attempts, then succeeds — for retry/fallback tests. */
export function failingProvider(options: { name?: string; failTimes?: number } = {}): EmailAdapter {
  const name = options.name ?? "failing";
  const failTimes = options.failTimes ?? Number.POSITIVE_INFINITY;
  let attempts = 0;
  return {
    name,
    async send(): Promise<SendResult> {
      attempts += 1;
      if (attempts <= failTimes) {
        throw new Error(`${name}: simulated failure ${attempts}`);
      }
      const id = `${name}_${attempts}`;
      return { id, provider: name, messageId: id };
    },
  };
}
