import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const reactEmailResend = defineIntegration({
  category: "email",
  provider: "react-email-resend",
  catalogEntries: () => [
    { name: "resend", version: VERSIONS.resend },
    { name: "@react-email/components", version: VERSIONS.reactEmailComponents },
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
});

export const emailIntegrations = [reactEmailResend, nodemailer];
