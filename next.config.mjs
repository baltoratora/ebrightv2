/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export -> Cloudflare Pages serves `out/` as static assets, and the
  // API lives in `functions/` as Pages Functions (with the Workers AI binding).
  output: "export",
  images: { unoptimized: true },
  // Lint is a separate gate (`npm run lint`), not part of the production build.
  // Cloudflare's build image ships an older Node than ESLint 9 needs, so running
  // ESLint inside `next build` there fails the deploy. Type-checking still runs.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
