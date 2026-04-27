import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const vercelAiSdk = defineIntegration({
  category: "ai",
  provider: "vercel-ai-sdk",
  catalogEntries: () => [
    { name: "ai", version: VERSIONS.ai },
    { name: "@ai-sdk/openai", version: VERSIONS.aiSdkOpenai },
  ],
  envVars: () => ({
    server: [
      {
        name: "OPENAI_API_KEY",
        zodType: "z.string().min(1)",
        example: "sk-...",
        description: "OpenAI API key",
      },
    ],
  }),
});

export const langchain = defineIntegration({
  category: "ai",
  provider: "langchain",
  catalogEntries: () => [],
});

export const aiIntegrations = [vercelAiSdk, langchain];
