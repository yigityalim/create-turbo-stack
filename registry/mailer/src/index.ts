export { type ResendAdapterConfig, resend } from "./adapters/resend";
export { createMailer, type Mailer, type MailerConfig } from "./client";
export { EmailSendError, EmailValidationError } from "./errors";
export { type EmailFromKind, emailFrom } from "./from";
export { sendEmail } from "./send";
export {
  type CaptureEvent,
  capturePlugin,
  createEmailCaptureStore,
  type EmailCaptureStore,
} from "./plugins/capture";
export { type DefaultsOptions, defaultsPlugin } from "./plugins/defaults";
export {
  type EmailObservabilityEvent,
  type ObservabilityOptions,
  observabilityPlugin,
} from "./plugins/observability";
export { failingProvider, type MemoryAdapter, type MemoryRecord, memoryProvider } from "./testing";
export * from "./types";
