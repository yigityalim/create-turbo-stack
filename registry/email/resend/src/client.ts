import { Resend } from "resend";
import { env } from "{{scope}}/env";

// Shared Resend client. Not process.env — always use the application env layer.
export const resend = new Resend(env.RESEND_API_KEY);
