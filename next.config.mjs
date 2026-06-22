import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root to this project (a stray lockfile in a parent
  // directory otherwise makes Next infer the wrong root).
  outputFileTracingRoot: __dirname,
  // Cloudflare Pages serves this via @cloudflare/next-on-pages.
  // Route Handlers run on the edge runtime (see app/api/*/route.ts).
};

export default nextConfig;
