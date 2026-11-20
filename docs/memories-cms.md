# Memories on www.baltoratora.my

The homepage links to `/memories`. The owner opens `/memories/admin` directly. New entries start as drafts. Add photos in cover-first order, then publish to create a public page at `/memories/<page-address>`. Unpublishing hides the page and its photo URLs again. Saving an already published entry updates its public page immediately.

## Cloudflare setup

Configure the **baltoratora-landing** Pages project.

1. Create a D1 database for Memories. Run [cloudflare/memories.sql](../cloudflare/memories.sql) on it before deploying. Bind it as `MEMORIES_DB`.
2. Create an R2 bucket and bind it as `MEMORIES_PHOTOS`. Keep public and custom-domain access to the bucket disabled. The site serves photos through the Pages Function, which checks whether the memory is published.
3. In Cloudflare Zero Trust, add a self-hosted Access application on `www.baltoratora.my` that covers both `/memories/admin` and `/memories/admin/*` under the same application. Set an Allow policy for the owner's exact email and enable their sign-in method. Leave the public `/memories` section outside the Access application.
4. Set these production variables on the landing Pages project.

   | Variable | Value |
   | --- | --- |
   | `MEMORIES_SITE_ORIGIN` | `https://www.baltoratora.my`, without a trailing slash |
   | `MEMORIES_ACCESS_ISSUER` | The Zero Trust team domain, including `https://` |
   | `MEMORIES_ACCESS_AUD` | The Access application's audience (AUD) tag |
   | `MEMORIES_OWNER_EMAIL` | The same email address as the Access Allow policy |

Deploy the `landing/` assets with the repository's root `functions/` directory on the landing project. Use the landing project's existing deployment settings. The root `wrangler.toml` config belongs to the demo project.

For a dashboard-configured Direct Upload project, you can stage the landing assets and Functions without importing the demo's Wrangler config. Run these commands from the repository root after installing dependencies.

```sh
landing_stage="$(mktemp -d)"
ln -s "$PWD/functions" "$landing_stage/functions"
npx wrangler pages deploy "$PWD/landing" --cwd "$landing_stage" --project-name baltoratora-landing
```

After deploying, open the direct editor URL and sign in. Create a draft and upload a test photo. In a signed-out browser, confirm the editor prompts for sign-in and the draft is unavailable. Publish it, confirm the page and photo are visible, then unpublish the test entry.
