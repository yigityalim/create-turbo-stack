import path from "node:path";
import type { Integrations } from "@create-turbo-stack/schema";
import type { Detection } from "../types";
import { hasDep, readPackageJson } from "../utils/dep-scanner";
import { listDirs } from "../utils/file-scanner";

export async function detectIntegrations(root: string): Promise<{
  integrations: Integrations;
  detections: Record<string, Detection<string>>;
}> {
  // Collect all deps from all packages
  const allPkgs = await collectAllPackageJsons(root);

  const analytics = detectAnalytics(allPkgs);
  const errorTracking = detectErrorTracking(allPkgs);
  const email = detectEmail(allPkgs);
  const rateLimit = detectRateLimit(allPkgs);
  const ai = detectAi(allPkgs);
  const envValidation = detectEnvValidation(allPkgs);

  return {
    integrations: {
      analytics: analytics.value as Integrations["analytics"],
      errorTracking: errorTracking.value as Integrations["errorTracking"],
      email: email.value as Integrations["email"],
      rateLimit: rateLimit.value as Integrations["rateLimit"],
      ai: ai.value as Integrations["ai"],
      envValidation: envValidation.value === "true",
    },
    detections: {
      analytics,
      errorTracking,
      email,
      rateLimit,
      ai,
      envValidation,
    },
  };
}

type PkgJson = NonNullable<Awaited<ReturnType<typeof readPackageJson>>>;

async function collectAllPackageJsons(root: string): Promise<PkgJson[]> {
  const pkgs: PkgJson[] = [];

  const rootPkg = await readPackageJson(root);
  if (rootPkg) pkgs.push(rootPkg);

  for (const dir of ["apps", "packages"]) {
    const names = await listDirs(path.join(root, dir));
    for (const name of names) {
      const pkg = await readPackageJson(path.join(root, dir, name));
      if (pkg) pkgs.push(pkg);
    }
  }

  return pkgs;
}

function anyHasDep(pkgs: PkgJson[], name: string): boolean {
  return pkgs.some((p) => hasDep(p, name));
}

function detectAnalytics(pkgs: PkgJson[]): Detection<string> {
  if (anyHasDep(pkgs, "posthog-js") || anyHasDep(pkgs, "posthog-node")) {
    return {
      value: "posthog",
      confidence: "certain",
      reason: "posthog dependency found",
    };
  }
  if (anyHasDep(pkgs, "@vercel/analytics")) {
    return {
      value: "vercel-analytics",
      confidence: "certain",
      reason: "@vercel/analytics found",
    };
  }
  if (anyHasDep(pkgs, "plausible-tracker")) {
    return {
      value: "plausible",
      confidence: "certain",
      reason: "plausible-tracker found",
    };
  }
  return {
    value: "none",
    confidence: "medium",
    reason: "No analytics detected",
  };
}

function detectErrorTracking(pkgs: PkgJson[]): Detection<string> {
  if (anyHasDep(pkgs, "@sentry/nextjs") || anyHasDep(pkgs, "@sentry/node")) {
    return {
      value: "sentry",
      confidence: "certain",
      reason: "@sentry dependency found",
    };
  }
  return {
    value: "none",
    confidence: "medium",
    reason: "No error tracking detected",
  };
}

function detectEmail(pkgs: PkgJson[]): Detection<string> {
  if (anyHasDep(pkgs, "resend") || anyHasDep(pkgs, "@react-email/components")) {
    return {
      value: "react-email-resend",
      confidence: "certain",
      reason: "resend/react-email found",
    };
  }
  if (anyHasDep(pkgs, "nodemailer")) {
    return {
      value: "nodemailer",
      confidence: "certain",
      reason: "nodemailer found",
    };
  }
  return {
    value: "none",
    confidence: "medium",
    reason: "No email provider detected",
  };
}

function detectRateLimit(pkgs: PkgJson[]): Detection<string> {
  if (anyHasDep(pkgs, "@upstash/ratelimit")) {
    return {
      value: "upstash",
      confidence: "certain",
      reason: "@upstash/ratelimit found",
    };
  }
  return {
    value: "none",
    confidence: "medium",
    reason: "No rate limiter detected",
  };
}

function detectAi(pkgs: PkgJson[]): Detection<string> {
  if (anyHasDep(pkgs, "ai") || anyHasDep(pkgs, "@ai-sdk/openai")) {
    return {
      value: "vercel-ai-sdk",
      confidence: "certain",
      reason: "Vercel AI SDK found",
    };
  }
  if (anyHasDep(pkgs, "langchain")) {
    return {
      value: "langchain",
      confidence: "certain",
      reason: "langchain found",
    };
  }
  return { value: "none", confidence: "medium", reason: "No AI SDK detected" };
}

function detectEnvValidation(pkgs: PkgJson[]): Detection<string> {
  if (anyHasDep(pkgs, "@t3-oss/env-nextjs") || anyHasDep(pkgs, "@t3-oss/env-core")) {
    return {
      value: "true",
      confidence: "certain",
      reason: "@t3-oss/env found",
    };
  }
  return {
    value: "false",
    confidence: "medium",
    reason: "No env validation detected",
  };
}
