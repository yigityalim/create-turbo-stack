# email / plunk

Plunk transactional email transport. Exposes the same `sendEmail` interface as `email/resend` and `email/sendgrid` — switch providers by changing the installed slot variant; application code stays unchanged.

**Self-hosting advantage.** Plunk is open-source and runs on AWS SES. Set `PLUNK_BASE_URL` to point to your own instance for full control over your email infrastructure — no third-party data processing, KVKK/GDPR-friendly by design. Leave `PLUNK_BASE_URL` empty to use Plunk cloud.

**Differences from other variants:**

- **No `react` field.** Use `email-templates`' `render(<Email />)` to produce HTML, then pass it as `html`.
- **No idempotency.** The `idempotencyKey` field is accepted but silently ignored.
- **No scheduling.** `scheduledAt` is accepted but silently ignored.
- **No `replyTo`, `cc`, `bcc`, `headers`, `tags`.** The Plunk send API does not support these; they are accepted for interface compatibility and silently dropped.
- **No message ID in response.** Plunk's send API returns `{ success: true }` without a message ID. `result.id` will be an empty string on success.
- **`html` → `body` mapping.** Handled internally; callers always use `html`.
- **`from` parsing.** Accepts `"Name <email@domain.com>"` — the name and email are split and passed to Plunk's separate `name` and `from` fields.

**Error handling.** `sendEmail` never throws. Plunk throws on failures; this package catches and normalises them into `{ success: false, error }`.

| Error name | Cause |
|---|---|
| `invalid_api_key` | Wrong or missing PLUNK_API_KEY (TokenError) |
| `not_allowed` | Sender not found in your Plunk account |
| `validation_error` | Malformed request |
| `network_error` | Connection failure to Plunk (check PLUNK_BASE_URL) |

```ts
// Plunk cloud — PLUNK_BASE_URL not set or empty
import { sendEmail } from "{{scope}}/email";

const result = await sendEmail({
  from: "Acme <hello@acme.com>",
  to: "user@example.com",
  subject: "Welcome",
  html: "<h1>Welcome!</h1>",
});
if (!result.success) {
  logger.error(result.error);
}
```

```ts
// Self-hosted Plunk — set PLUNK_BASE_URL=https://plunk.yourcompany.com/api/v1/
// All other code is identical — slot swap changes nothing in the caller
import { sendEmail } from "{{scope}}/email";

const result = await sendEmail({
  from: "hello@yourcompany.com",
  to: user.email,
  subject: "Reset your password",
  html,
});
```

```ts
// With email-templates (transport-agnostic)
import { sendEmail } from "{{scope}}/email";
import { render, ResetPasswordEmail } from "{{scope}}/email-templates";

const html = await render(<ResetPasswordEmail resetUrl={url} userEmail={email} />);
await sendEmail({ from: "hello@acme.com", to: email, subject: "Reset password", html });
```
