import sgMail from "@sendgrid/mail";
import { env } from "{{scope}}/env";

// setApiKey is called at module load. Not process.env — use the application env layer.
sgMail.setApiKey(env.SENDGRID_API_KEY);

export { sgMail };
