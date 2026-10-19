# CLAUDE.md — ebrightv2 (baltoratora)

Repo-level instructions for AI assistants (Claude Code and similar) working in this repository.

## Working rules

- **Unfilled placeholders mean "stop and ask."** If a prompt contains unfilled
  placeholder brackets such as `[name]`, `[pass / list issues]`, or `[...]`,
  treat the message as not finalized. Ask which value is intended and wait for
  the answer — never infer the intended branch, even when one reading seems
  obvious. This is strictest before irreversible or outward-facing actions
  (merge, push, deploy, publish, send).

## Project conventions

- **Game pattern:** thin server wrapper `app/<game>/page.tsx` → a `"use client"`
  component in `components/` → pure logic + Vitest tests in `lib/<game>.ts` /
  `lib/<game>.test.ts` → one entry in the `GAMES` array in
  `app/thinking/page.tsx` → styles in `app/globals.css` using the existing
  design tokens (`--accent`, `--surface`, `--green`, etc.).
- **Import alias:** `@/*` → `./*` (see `tsconfig.json`).
- **Gates before commit:** `npm test`, `npx tsc --noEmit`, `npm run lint`,
  `npm run build`.
- **Git:** a feature branch per change; never commit to `main` directly; PRs
  land as merge commits.
- **Deploy:** `main` auto-deploys to Cloudflare Pages — merging to `main` means
  going live.
- **Leaderboards:** D1-backed, registered via `GAME_META` in
  `lib/leaderboard.ts`.
