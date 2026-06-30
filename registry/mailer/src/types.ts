export type MaybePromise<T> = T | Promise<T>;

export type EmailAddress = string | { email: string; name?: string };
export type EmailTag = { name: string; value: string };
export type EmailHeaders = Record<string, string>;
export type EmailMetadata = Record<string, string | number | boolean | null>;

export interface EmailAttachment {
  filename: string;
  content: string | Uint8Array;
  contentType?: string;
}

export interface EmailMessage {
  from: EmailAddress;
  to: EmailAddress | EmailAddress[];
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  replyTo?: EmailAddress | EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  headers?: EmailHeaders;
  tags?: EmailTag[];
  metadata?: EmailMetadata;
  attachments?: EmailAttachment[];
}

export interface SendOptions {
  idempotencyKey?: string;
  /** Send-scope metadata — flows to hooks, never to the provider. */
  metadata?: Record<string, unknown>;
}

/** Send options after defaults are merged; passed to adapters and hooks. */
export interface ResolvedSendOptions {
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
}

export interface SendResult {
  /** Provider-native id. */
  id: string;
  provider: string;
  messageId: string;
}

export interface EmailAdapter {
  readonly name: string;
  send(message: EmailMessage, options: ResolvedSendOptions): Promise<SendResult>;
}

export interface BeforeSendContext {
  message: EmailMessage;
  options: ResolvedSendOptions;
}

export interface AfterSendEvent {
  provider: string;
  attempt: number;
  message: EmailMessage;
  options: ResolvedSendOptions;
  response: SendResult;
}

export interface RetryEvent {
  provider: string;
  attempt: number;
  nextAttempt: number;
  delayMs: number;
  error: Error;
  message: EmailMessage;
  options: ResolvedSendOptions;
}

export interface ErrorEvent {
  provider: string;
  attempt: number;
  error: Error;
  message: EmailMessage;
  options: ResolvedSendOptions;
}

export interface EmailPlugin {
  readonly id: string;
  /** Transform the message before validation/send. Return a new message to replace it. */
  beforeSend?(ctx: BeforeSendContext): MaybePromise<EmailMessage | undefined>;
  afterSend?(event: AfterSendEvent): MaybePromise<void>;
  onRetry?(event: RetryEvent): MaybePromise<void>;
  onError?(event: ErrorEvent): MaybePromise<void>;
}

/** Redacted message summary — safe for logs (no recipients, bodies, or values). */
export interface RedactedEmailMessage {
  subject: string;
  toCount: number;
  ccCount: number;
  bccCount: number;
  hasHtml: boolean;
  hasText: boolean;
  attachmentCount: number;
  tagNames: string[];
  metadataKeys: string[];
}
