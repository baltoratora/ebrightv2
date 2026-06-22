/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export -> Cloudflare Pages serves `out/` as static assets, and the
  // API lives in `functions/` as Pages Functions (with the Workers AI binding).
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
