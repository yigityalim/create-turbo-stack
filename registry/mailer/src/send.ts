import { resend } from "./adapters/resend";
import { createMailer, type Mailer } from "./client";
import { emailFrom } from "./from";
import type { EmailMessage, SendOptions, SendResult } from "./types";

// Lazy default mailer — Resend adapter built from the environment. Returns null
// (instead of throwing) when RESEND_API_KEY is absent, so builds never crash.
let cachedMailer: Mailer | null = null;
function getMailer(): Mailer | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedMailer) cachedMailer = createMailer({ adapters: [resend({ apiKey })] });
  return cachedMailer;
}

type SendEmailInput = Omit<EmailMessage, "from"> & {
  from?: EmailMessage["from"];
};

/**
 * Convenience send for the common single-provider case. For defaults,
 * fallbacks, retries, or observability, build a mailer with `createMailer`.
 */
export async function sendEmail(
  input: SendEmailInput,
  options?: SendOptions,
): Promise<{ data: SendResult | null; error: Error | null }> {
  const mailer = getMailer();
  if (!mailer) {
    if (process.env.NODE_ENV === "production") {
      console.warn("RESEND_API_KEY is missing. Email not sent.");
    }
    return { data: null, error: new Error("RESEND_API_KEY is missing") };
  }

  try {
    const data = await mailer.send({ from: emailFrom("noreply"), ...input }, options);
    return { data, error: null };
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error(String(caught));
    return { data: null, error };
  }
}
