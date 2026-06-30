/**
 * Single source for every outgoing sender address. Set `EMAIL_DOMAIN` and
 * verify that one domain with your provider (SPF + DKIM + DMARC) — all senders
 * then work. Edit the display names below to match your product.
 *
 * monitored = replies are read (support, security); noreply = transactional
 * default whose replies are not watched.
 */
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "example.com";

export type EmailFromKind = "noreply" | "support" | "security";

const REGISTRY: Record<EmailFromKind, { prefix: string; display: string }> = {
  noreply: { prefix: "noreply", display: "Acme" },
  support: { prefix: "support", display: "Acme Support" },
  security: { prefix: "security", display: "Acme Security" },
};

export function emailFrom(kind: EmailFromKind): string {
  const { prefix, display } = REGISTRY[kind];
  return `${display} <${prefix}@${EMAIL_DOMAIN}>`;
}
