# Slot: `ai`

LLM client + helpers. One variant per `integrations.ai` value.

| Variant id | Provider |
|------------|----------|
| `vercel-ai-sdk` | Vercel AI SDK (provider-agnostic, recommended). |
| `openai` | Direct OpenAI client. |

Each item exposes a configured `<scope>/ai` surface — a `streamText` /
`generateText` helper for the AI SDK variant, an `openai` client for the
direct variant. Plus a streaming Next.js route handler example
(`app/api/chat/route.ts`).

- Declares the provider API key in `envVars`.
- `registryDependencies: ["env-t3"]`.
- `environment: "node"` (these SDKs use Node streams).

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
