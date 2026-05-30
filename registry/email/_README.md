# Slot: `email`

Transactional email providers. One variant per `integrations.email` value.

| Variant id | Provider |
|------------|----------|
| `resend` | Resend (React Email templates). |
| `sendgrid` | SendGrid. |
| `plunk` | Plunk. |

Each item:

- Exposes a `sendEmail(opts)` helper from `<scope>/email`.
- Declares the provider's API key in `envVars`.
- `registryDependencies: ["env-t3"]`.
- `environment: "node"` (HTTP clients are Node-only in practice).

A common pattern: a tiny shared `src/templates/` directory with a couple of
example templates (welcome, password-reset) the user can edit.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
