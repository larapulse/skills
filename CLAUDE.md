# larapulse/skills

Personal agent skills, reused across accounts and devices. Complements superpowers rather than re-implementing it.

## Branching

`master` is the default branch. Work, commit and push directly on `master`.

## Layout

The repo root is both the plugin (`larapulse`) and its marketplace (`larapulse-skills`), see `.claude-plugin/`.

- `global-rules.md`: the user's global instructions; `hooks/hooks.json` injects it at session start.
- `hooks/protect-secrets.py`: PreToolUse guard against reading secrets, remote shells and uploads. Test every pattern change with sample tool calls.
- `agents/`: subagents.
- `skills/`: skills; commands (user-invoked only) set `disable-model-invocation: true`.

## Conventions

- Short descriptions, no `model` pin, nothing Claude does anyway.
- Adapted third-party files carry a frontmatter comment `# Adapted from <repo> (<licence>), modified. See THIRD_PARTY_NOTICES.md.`, a row in `THIRD_PARTY_NOTICES.md`, and the licence text in `LICENSES/`.
- Run `claude plugin validate .` after touching `.claude-plugin/` or `hooks/`.
