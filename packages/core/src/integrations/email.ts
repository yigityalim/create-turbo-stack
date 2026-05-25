import { renderSourceFiles } from "../render/render-source";
import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const reactEmailResend = defineIntegration({
  category: "email",
  provider: "react-email-resend",
  catalogEntries: () => [
    { name: "resend", version: VERSIONS.resend },
    { name: "@react-email/components", version: VERSIONS.reactEmailComponents },
    // React Email templates are .tsx; keep the React toolchain catalogued.
    { name: "react", version: VERSIONS.react },
    { name: "react-dom", version: VERSIONS.reactDom },
    { name: "@types/react", version: VERSIONS.typesReact },
    { name: "@types/react-dom", version: VERSIONS.typesReactDom },
  ],
  envVars: () => ({
    server: [
      {
        name: "RESEND_API_KEY",
        zodType: "z.string().min(1)",
        example: "re_...",
        description: "Resend API key",
      },
      {
        name: "EMAIL_FROM",
        zodType: "z.string().email()",
        example: "noreply@example.com",
        description: "Default sender email address",
      },
    ],
  }),
  // welcome.tsx is JSX → JSX tsconfig + React deps.
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({
      deps: {
        resend: "catalog:",
        "@react-email/components": "catalog:",
        react: "catalog:",
        "react-dom": "catalog:",
      },
      react: true,
    }),
    ...renderSourceFiles("integration/email/react-email-resend", ctx.base, {}),
  ],
});

export const nodemailer = defineIntegration({
  category: "email",
  provider: "nodemailer",
  catalogEntries: () => [{ name: "nodemailer", version: VERSIONS.nodemailer }],
  envVars: () => ({
    server: [
      {
        name: "SMTP_HOST",
        zodType: "z.string().min(1)",
        example: "smtp.gmail.com",
        description: "SMTP host",
      },
      {
        name: "SMTP_PORT",
        zodType: "z.string().min(1)",
        example: "587",
        description: "SMTP port",
      },
      {
        name: "SMTP_USER",
        zodType: "z.string().min(1)",
        example: "user@example.com",
        description: "SMTP user",
      },
      {
        name: "SMTP_PASS",
        zodType: "z.string().min(1)",
        example: "password",
        description: "SMTP password",
      },
    ],
  }),
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({ deps: { nodemailer: "catalog:" } }),
    ...renderSourceFiles("integration/email/nodemailer", ctx.base, {}),
  ],
});

export const emailIntegrations = [reactEmailResend, nodemailer];
