# email-templates

React Email transactional templates for the three most universal categories: auth flows, account/data-privacy (KVKK/GDPR), and billing. Each template is a typed React component with `PreviewProps` for local preview. Rendering produces an HTML string — pass it to any email provider (`sendEmail({ html })`, Resend's `react` field, Nodemailer, SendGrid, etc.). Runs in Node.js where JSX transpilation and React Email's render pipeline are available.

**Customize in one place.** Edit `src/emails/tailwind.config.ts` to set your brand colors, logo URL, company name, and address. All 14 templates inherit from this file — you do not touch individual templates to rebrand.

**These are starting skeletons, not production designs.** Copy them into your project, add your logo, adjust copy, and make them yours. The CTS+ email suite adds polished, brand-ready, i18n-aware variants.

**What is included:**

- **auth/** — `verify-email`, `reset-password`, `magic-link`, `welcome`, `new-login`, `password-changed`, `email-changed`, `mfa-changed`, `team-invitation`
- **account/** — `data-export-ready`, `deletion-requested`, `deletion-completed` (KVKK/GDPR data rights)
- **billing/** — `payment-receipt`, `subscription-event` (started / renewed / canceled / paused / reactivated)

**What is not included:** domain-specific templates (recruitment, e-commerce, support tickets, onboarding nudges, newsletters, campaigns). Those belong in your application or a future CTS+ slice.

**Email CSS warning:** Outlook uses the Word rendering engine. Flexbox, CSS Grid, CSS variables, and `calc()` do not work. The templates use only email-safe properties. If you extend them, stay within those constraints — check [caniemail.com](https://www.caniemail.com) before adding CSS.

```ts
// Render to HTML — pass to any provider
import { render, VerifyEmail } from "{{scope}}/email-templates";

const html = await render(<VerifyEmail verificationUrl={url} userEmail={email} />);

// Plain text version (for accessibility / spam score)
const text = await render(<VerifyEmail verificationUrl={url} userEmail={email} />, {
  plainText: true,
});
```

```ts
// With email/resend transport
import { sendEmail } from "{{scope}}/email";
import { render, ResetPasswordEmail } from "{{scope}}/email-templates";

const html = await render(<ResetPasswordEmail resetUrl={url} userEmail={email} />);
const { success, id, error } = await sendEmail({
  from: "Acme <hello@acme.com>",
  to: email,
  subject: "Reset your password",
  html,
  idempotencyKey: `password-reset/${resetTokenId}`,
});
```

```ts
// Or pass the component directly via Resend's react field
import { sendEmail } from "{{scope}}/email";
import { ResetPasswordEmail } from "{{scope}}/email-templates";

await sendEmail({
  from: "Acme <hello@acme.com>",
  to: email,
  subject: "Reset your password",
  react: <ResetPasswordEmail resetUrl={url} userEmail={email} />,
});
```

```ts
// Preview locally with react-email dev server
// Add to package.json: "email": "email dev --dir src/emails --port 3000"
// Then: bun run email
```

**Providers without React support** (Plunk, SendGrid, Mailchimp, etc.) need static HTML files. The `react-email` CLI exports every template to `exported/`:

```bash
# HTML only
bun run email:export

# HTML + plain text (.txt) versions
bun run email:export:text
```

This produces `exported/auth/verify-email.html`, `exported/billing/payment-receipt.html`, etc. Use the file contents as your provider's HTML template body. The scripts are in the package's `scripts` section; add them to `package.json` after installing.
