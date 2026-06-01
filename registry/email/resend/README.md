# email / resend

Transactional email transport backed by Resend. Wraps `resend.emails.send` and `resend.batch.send` with a typed Result pattern, idempotency support, and consistent error handling. This package is transport-only — it does not render templates or import React. It runs in Node.js server-side (Next.js API routes, server actions, edge functions) because Resend's `react` field requires Node.js to render React components.

Before sending, verify your sending domain in the Resend dashboard. Emails sent from an unverified domain return `not_allowed`.

**Body field — which to use:**
- `html` — HTML string you built yourself or with a template library.
- `text` — Plain text fallback. Resend auto-generates one from `html` if you omit it.
- `react` — A React element. Resend renders it server-side into HTML. Pass the result of calling your React Email component. The upcoming `email-templates` package will provide ready-made components for common transactional flows.

**Idempotency — why it matters and how to use it:** Transactional emails are often triggered by webhooks, job queues, or payment events — environments where retry is the default recovery strategy. Without idempotency keys, a retry after a network timeout resends the email. With a key, Resend returns the original result if the same payload is received again within 24 hours. Format: `"event-type/entity-id"` (e.g., `"password-reset/user-42"`).

**Error handling:** `sendEmail` never throws. It always returns `{ success: true, id }` or `{ success: false, error }`. Network exceptions are caught and normalized into the same shape. Common errors:

| Error name | Cause | Action |
|---|---|---|
| `not_allowed` | Sending domain not verified | Verify domain in Resend dashboard |
| `invalid_api_key` | Wrong or missing key | Check env.RESEND_API_KEY |
| `rate_limit_exceeded` | Too many requests | Retry with exponential backoff + same idempotencyKey |
| `invalid_idempotent_request` | Same key, different payload | Change key or payload — retrying is useless |
| `concurrent_idempotent_requests` | Parallel request with same key | Safe to retry after a short delay |

```ts
// Basic HTML email
import { sendEmail } from "{{scope}}/email";

const result = await sendEmail({
  from: "Acme <hello@acme.com>",
  to: "user@example.com",
  subject: "Welcome to Acme",
  html: "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
});
if (!result.success) {
  logger.error("email failed", result.error);
  return;
}
console.log("sent:", result.id);
```

```ts
// React Email component (render happens in Resend, not here)
import { sendEmail } from "{{scope}}/email";
import WelcomeEmail from "@/emails/welcome"; // your React Email component

const result = await sendEmail({
  from: "Acme <hello@acme.com>",
  to: user.email,
  subject: "Welcome to Acme",
  react: WelcomeEmail({ name: user.name }), // call component, pass element
});
```

```ts
// Password reset with idempotency — safe to retry on network failure
import { sendEmail } from "{{scope}}/email";

const result = await sendEmail({
  from: "Acme <hello@acme.com>",
  to: user.email,
  subject: "Reset your password",
  html: `<a href="${resetUrl}">Reset password</a>`,
  idempotencyKey: `password-reset/${resetTokenId}`,
});
```

```ts
// Batch send — up to 100 emails per call
import { sendBatchEmail } from "{{scope}}/email";

const result = await sendBatchEmail(
  notifications.map((n) => ({
    from: "Acme <hello@acme.com>",
    to: n.email,
    subject: n.subject,
    html: n.body,
  })),
  { idempotencyKey: `weekly-digest/${batchId}` },
);
if (result.success) {
  console.log("sent:", result.ids.length, "emails");
}
```
