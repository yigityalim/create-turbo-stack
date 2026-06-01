# email / sendgrid

SendGrid transactional email transport. Exposes the same `sendEmail` interface as `email/resend` — switch providers by changing which slot variant is installed; application code stays unchanged.

`environment: "node"` because SendGrid requires server-side execution. The `from` address (or domain) must be verified in your SendGrid account before sending.

**Differences from `email/resend`:**

- **No `react` field.** SendGrid does not render React components. Use `email-templates`' `render(<Email />)` to produce an HTML string, then pass it as `html`.
- **No native idempotency.** The `idempotencyKey` field is accepted (for interface compatibility) but silently ignored. If you need deduplication, track sent message IDs in your database and gate sends yourself.
- **Dynamic templates.** SendGrid's server-side templates are supported via `templateId` + `dynamicTemplateData`. When `templateId` is set, `html` and `text` are ignored by SendGrid.
- **`scheduledAt`** is converted from ISO 8601 to Unix epoch seconds automatically.
- **`tags`** are mapped to SendGrid `categories` (string labels for analytics); the `value` field has no equivalent and is dropped.

**Error handling.** `sendEmail` never throws. SendGrid throws on API errors; this package catches and normalises them into `{ success: false, error }`. Common errors:

| Status | `error.name` | Cause |
|---|---|---|
| 401 | `invalid_api_key` | Wrong or missing API key |
| 403 | `not_allowed` | Sender address or domain not verified |
| 400 | `validation_error` | Malformed request; inspect `error.message` |
| 429 | `rate_limit_exceeded` | Too many requests |

```ts
// Basic HTML email
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
// With email-templates (transport-agnostic render)
import { sendEmail } from "{{scope}}/email";
import { render, WelcomeEmail } from "{{scope}}/email-templates";

const html = await render(<WelcomeEmail userName="Alex" loginUrl={url} />);
const result = await sendEmail({
  from: "Acme <hello@acme.com>",
  to: user.email,
  subject: "Welcome to Acme",
  html,
});
```

```ts
// SendGrid dynamic template (server-side template, no html/text needed)
import { sendEmail } from "{{scope}}/email";

const result = await sendEmail({
  from: "hello@acme.com",
  to: user.email,
  subject: "Reset your password",  // overridden by template if subject is set there
  templateId: "d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  dynamicTemplateData: { resetUrl, userName: user.name, expiresIn: "30 minutes" },
});
```
