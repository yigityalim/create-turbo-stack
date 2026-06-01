import Plunk from "@plunk/node";
import { env } from "{{scope}}/env";

// PLUNK_BASE_URL is optional. Leave empty for Plunk cloud.
// Set to your self-hosted Plunk instance URL for KVKK/privacy compliance:
//   e.g. "https://plunk.yourcompany.com/api/v1/"
export const plunk = new Plunk(
  env.PLUNK_API_KEY,
  env.PLUNK_BASE_URL ? { baseUrl: env.PLUNK_BASE_URL } : undefined,
);
