import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext's build runs `config.buildCommand` to produce the Next.js build.
// Our npm `build` script IS the OpenNext build (the dashboard calls
// `npm run build`), so point OpenNext at `next build` directly — otherwise it
// would re-invoke `npm run build` and recurse infinitely.
const config = defineCloudflareConfig();
config.buildCommand = "next build";

export default config;
