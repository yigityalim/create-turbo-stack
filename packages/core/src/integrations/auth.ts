import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const clerk = defineIntegration({
  category: "auth",
  provider: "clerk",
  catalogEntries: () => [{ name: "@clerk/nextjs", version: VERSIONS.clerkNextjs }],
  envVars: () => ({
    server: [
      {
        name: "CLERK_SECRET_KEY",
        zodType: "z.string().min(1)",
        example: "sk_test_...",
        description: "Clerk secret key",
      },
    ],
    client: [
      {
        name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        zodType: "z.string().min(1)",
        example: "pk_test_...",
        description: "Clerk publishable key",
      },
    ],
  }),
});

export const betterAuth = defineIntegration({
  category: "auth",
  provider: "better-auth",
  catalogEntries: () => [{ name: "better-auth", version: VERSIONS.betterAuth }],
  envVars: () => ({
    server: [
      {
        name: "BETTER_AUTH_SECRET",
        zodType: "z.string().min(32)",
        example: "openssl rand -hex 32",
        description: "Better Auth signing secret (min 32 chars)",
      },
      {
        name: "BETTER_AUTH_URL",
        zodType: "z.string().url()",
        example: "http://localhost:3000",
        description: "Better Auth base URL (for callbacks)",
      },
      {
        name: "GOOGLE_CLIENT_ID",
        zodType: "z.string().optional()",
        example: "xxx.apps.googleusercontent.com",
        description: "OAuth — Google client ID (optional)",
      },
      {
        name: "GOOGLE_CLIENT_SECRET",
        zodType: "z.string().optional()",
        example: "GOCSPX-...",
        description: "OAuth — Google client secret (optional)",
      },
      {
        name: "GITHUB_CLIENT_ID",
        zodType: "z.string().optional()",
        example: "Iv1.xxx",
        description: "OAuth — GitHub client ID (optional)",
      },
      {
        name: "GITHUB_CLIENT_SECRET",
        zodType: "z.string().optional()",
        example: "ghs_...",
        description: "OAuth — GitHub client secret (optional)",
      },
    ],
  }),
});

export const nextAuth = defineIntegration({
  category: "auth",
  provider: "next-auth",
  catalogEntries: () => [{ name: "next-auth", version: VERSIONS.nextAuth }],
  envVars: () => ({
    server: [
      {
        name: "AUTH_SECRET",
        zodType: "z.string().min(32)",
        example: "openssl rand -base64 32",
        description: "NextAuth signing secret (min 32 chars)",
      },
      {
        name: "AUTH_TRUST_HOST",
        zodType: "z.string().optional()",
        example: "true",
        description: "Trust the host header (true behind proxies)",
      },
      {
        name: "AUTH_GOOGLE_ID",
        zodType: "z.string().optional()",
        example: "xxx.apps.googleusercontent.com",
        description: "OAuth — Google client ID (optional)",
      },
      {
        name: "AUTH_GOOGLE_SECRET",
        zodType: "z.string().optional()",
        example: "GOCSPX-...",
        description: "OAuth — Google client secret (optional)",
      },
      {
        name: "AUTH_GITHUB_ID",
        zodType: "z.string().optional()",
        example: "Iv1.xxx",
        description: "OAuth — GitHub client ID (optional)",
      },
      {
        name: "AUTH_GITHUB_SECRET",
        zodType: "z.string().optional()",
        example: "ghs_...",
        description: "OAuth — GitHub client secret (optional)",
      },
    ],
  }),
});

export const lucia = defineIntegration({
  category: "auth",
  provider: "lucia",
  // Lucia's npm version is in flux; no catalog entry by default — users
  // pick adapter & version manually. Add when you settle on a stack.
  catalogEntries: () => [],
  envVars: () => ({
    server: [
      {
        name: "LUCIA_SECRET",
        zodType: "z.string().min(32)",
        example: "openssl rand -hex 32",
        description: "Lucia session signing secret (min 32 chars)",
      },
    ],
  }),
});

export const supabaseAuth = defineIntegration({
  category: "auth",
  provider: "supabase-auth",
  // Env vars + catalog entries come from the Supabase database integration.
  // Listing them here would duplicate (and risk drifting from) that record.
  catalogEntries: () => [],
});

export const authIntegrations = [clerk, betterAuth, nextAuth, lucia, supabaseAuth];
