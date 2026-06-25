import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript (build: none) — Next.js compiles
  // them in-app. Empty when this app consumes no workspace packages.
  transpilePackages: [{{workspace-deps}}],
};

export default nextConfig;
