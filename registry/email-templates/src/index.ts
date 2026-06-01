// Auth
export { VerifyEmail } from "./auth/verify-email";
export { ResetPasswordEmail } from "./auth/reset-password";
export { MagicLinkEmail } from "./auth/magic-link";
export { WelcomeEmail } from "./auth/welcome";
export { NewLoginEmail } from "./auth/new-login";
export { PasswordChangedEmail } from "./auth/password-changed";
export { EmailChangedEmail } from "./auth/email-changed";
export { MfaChangedEmail } from "./auth/mfa-changed";
export { TeamInvitationEmail } from "./auth/team-invitation";

// Account (KVKK / GDPR)
export { DataExportReadyEmail } from "./account/data-export-ready";
export { DeletionRequestedEmail } from "./account/deletion-requested";
export { DeletionCompletedEmail } from "./account/deletion-completed";

// Billing
export { PaymentReceiptEmail } from "./billing/payment-receipt";
export { SubscriptionEventEmail } from "./billing/subscription-event";

// Props types
export type { VerifyEmailProps } from "./auth/verify-email";
export type { ResetPasswordEmailProps } from "./auth/reset-password";
export type { MagicLinkEmailProps } from "./auth/magic-link";
export type { WelcomeEmailProps } from "./auth/welcome";
export type { NewLoginEmailProps } from "./auth/new-login";
export type { PasswordChangedEmailProps } from "./auth/password-changed";
export type { EmailChangedEmailProps } from "./auth/email-changed";
export type { MfaChangedEmailProps, MfaAction } from "./auth/mfa-changed";
export type { TeamInvitationEmailProps } from "./auth/team-invitation";
export type { DataExportReadyEmailProps } from "./account/data-export-ready";
export type { DeletionRequestedEmailProps } from "./account/deletion-requested";
export type { DeletionCompletedEmailProps } from "./account/deletion-completed";
export type { PaymentReceiptEmailProps } from "./billing/payment-receipt";
export type {
  SubscriptionEventEmailProps,
  SubscriptionEventType,
} from "./billing/subscription-event";

// Render utilities — re-export so callers don't need a separate import
export { render } from "react-email"; // Plain text: render(el, { plainText: true })

// Brand config — export for callers who need to override defaults
export { default as tailwindConfig, brand } from "./tailwind.config";
