import { createOpenAI } from "@ai-sdk/openai";
import { env } from "{{scope}}/env";

/** OpenAI provider bound to the validated OPENAI_API_KEY. */
export const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export { generateText, streamText } from "ai";
