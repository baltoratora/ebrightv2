import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Build artifacts and the separate Cloudflare runtimes (functions/, worker/)
  // have their own tsconfigs / globals — lint the Next app only.
  {
    ignores: [
      "out/**",
      ".next/**",
      ".wrangler/**",
      ".vercel/**",
      ".open-next/**",
      "node_modules/**",
      "functions/**",
      "worker/**",
      "next-env.d.ts",
    ],
  },
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),
];

export default eslintConfig;
