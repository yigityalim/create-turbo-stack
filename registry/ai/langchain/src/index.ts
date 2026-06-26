import { ChatOpenAI } from "@langchain/openai";
import { env } from "{{scope}}/env";

export const model = new ChatOpenAI({
  apiKey: env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
});
