import { renderSourceFiles } from "../render/render-source";
import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const vercelAiSdk = defineIntegration({
  category: "ai",
  provider: "vercel-ai-sdk",
  label: "Vercel AI SDK",
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
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({ deps: { ai: "catalog:", "@ai-sdk/openai": "catalog:" } }),
    ...renderSourceFiles("integration/ai/vercel-ai-sdk", ctx.base, {}),
  ],
});

export const langchain = defineIntegration({
  category: "ai",
  provider: "langchain",
  label: "LangChain",
  catalogEntries: () => [],
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase(),
    ...renderSourceFiles("integration/ai/langchain", ctx.base, {}),
  ],
});

export const aiIntegrations = [vercelAiSdk, langchain];
