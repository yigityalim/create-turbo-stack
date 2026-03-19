import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: [
    "@create-turbo-stack/core",
    "@create-turbo-stack/schema",
    "@create-turbo-stack/templates",
  ],
  serverExternalPackages: ["@takumi-rs/image-response"],
  reactStrictMode: true,
  logging: {
    browserToTerminal: true,
  },
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
};

export default withMDX(config);
