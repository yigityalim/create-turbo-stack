export { resend } from "./client";

export type {
  EmailErrorName,
  EmailError,
  SendEmailOptions,
  SendEmailResult,
  SendEmailSuccess,
  SendEmailFailure,
  BatchEmailItem,
  SendBatchResult,
  SendBatchSuccess,
  SendBatchFailure,
} from "./send";
export { sendEmail, sendBatchEmail } from "./send";
