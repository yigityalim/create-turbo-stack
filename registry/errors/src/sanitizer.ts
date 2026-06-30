/**
 * PII sanitization — the last line of defense before values reach a log
 * transport. Masks the values of sensitive keys and obvious secrets/PII in
 * free strings. Add keys as new sensitive fields appear.
 */
const SENSITIVE_KEYS = new Set([
  // auth credentials
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "passwordhash",
  "secret",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "sessiontoken",
  "authtoken",
  "bearertoken",
  "csrftoken",
  // api / crypto keys
  "apikey",
  "apisecret",
  "privatekey",
  "encryptionkey",
  "signingkey",
  "webhooksecret",
  "cronsecret",
  "internalsecret",
  "hmac",
  "signature",
  "salt",
  "nonce",
  "iv",
  // financial pii
  "creditcard",
  "cardnumber",
  "cvv",
  "cvc",
  "iban",
  "pan",
  "taxid",
  // personal pii / transport
  "email",
  "phone",
  "ssn",
  "authorization",
  "cookie",
  "setcookie",
]);

export const REDACTED = "[REDACTED]";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._-]+/gi;

/** Normalize a key for lookup: `API_KEY`, `apiKey`, `api-key` → `apikey`. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function maskString(value: string): string {
  return value.replace(EMAIL_RE, REDACTED).replace(BEARER_RE, `Bearer ${REDACTED}`);
}

/** Recursively mask sensitive keys and secrets/PII in strings. Circular-safe. */
export function sanitize(input: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof input === "string") return maskString(input);
  if (input === null || typeof input !== "object") return input;
  if (seen.has(input)) return "[Circular]";
  seen.add(input);

  if (Array.isArray(input)) return input.map((value) => sanitize(value, seen));

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = SENSITIVE_KEYS.has(normalizeKey(key)) ? REDACTED : sanitize(value, seen);
  }
  return output;
}
