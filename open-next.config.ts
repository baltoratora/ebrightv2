import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext Cloudflare config: runs the Next.js app as a Worker with
// static assets. No incremental cache configured (the app fetches live data).
export default defineCloudflareConfig();
