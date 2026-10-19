# CLAUDE.md — ebrightv2 (baltoratora)

Repo-level instructions for AI assistants (Claude Code and similar) working in this repository.

## Working rules

- **Unfilled placeholders mean "stop and ask."** If a prompt contains unfilled
  placeholder brackets such as `[name]`, `[pass / list issues]`, or `[...]`,
  treat the message as not finalized. Ask which value is intended and wait for
  the answer — never infer the intended branch, even when one reading seems
  obvious. This is strictest before irreversible or outward-facing actions
  (merge, push, deploy, publish, send).
