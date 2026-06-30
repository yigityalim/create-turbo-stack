import { AppError, toAppError } from "./app-error";

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Run `fn`, returning a `Result` instead of throwing. Errors become `AppError`. */
export async function tryCatch<T>(fn: () => Promise<T> | T): Promise<Result<T, AppError>> {
  try {
    return ok(await fn());
  } catch (caught) {
    return err(toAppError(caught));
  }
}

export class TimeoutError extends Error {
  readonly ms: number;
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = "TimeoutError";
    this.ms = ms;
  }
}

/** Reject with `TimeoutError` if `promise` doesn't settle within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface RetryOptions {
  /** Total attempts including the first (default 3). */
  attempts?: number;
  /** Base delay in ms (default 500). */
  baseDelay?: number;
  /** Jitter fraction 0..1 (default 0.2). */
  jitter?: number;
  /** Decide if an error is retryable (default: `error.retryable`). */
  retryable?: (error: AppError) => boolean;
  onRetry?: (attempt: number, error: AppError) => void;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable for tests. */
  random?: () => number;
}

/** Retry `fn` with exponential backoff while the error is retryable. */
export async function retry<T>(
  fn: () => Promise<T> | T,
  options: RetryOptions = {},
): Promise<Result<T, AppError>> {
  const attempts = options.attempts ?? 3;
  const baseDelay = options.baseDelay ?? 500;
  const jitter = options.jitter ?? 0.2;
  const isRetryable = options.retryable ?? ((error) => error.retryable);
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;

  let last: AppError | undefined;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await tryCatch(fn);
    if (result.ok) return result;

    last = result.error;
    if (attempt === attempts || !isRetryable(result.error)) break;

    options.onRetry?.(attempt, result.error);
    const delay = baseDelay * 2 ** (attempt - 1);
    const jitterMs = delay * jitter * (random() * 2 - 1);
    await sleep(Math.max(0, delay + jitterMs));
  }

  return err(last ?? new AppError("INTERNAL", "retry exhausted"));
}
