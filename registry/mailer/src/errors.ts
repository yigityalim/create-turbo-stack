/** Thrown when a message is invalid or a route cannot represent a field. */
export class EmailValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailValidationError";
  }
}

/** Thrown when every adapter route fails after exhausting its retries. */
export class EmailSendError extends Error {
  readonly provider?: string;
  override readonly cause?: Error;
  constructor(message: string, options?: { provider?: string; cause?: Error }) {
    super(message);
    this.name = "EmailSendError";
    this.provider = options?.provider;
    this.cause = options?.cause;
  }
}
