# Third-party notices

Files adapted from third-party work keep their original license. License texts are in `LICENSES/` (`Apache-2.0.txt` for Anthropic, `MIT-mattpocock.txt` for Matt Pocock, `MIT-vercel-labs.txt` for Vercel Labs, `MIT-superpowers.txt` for superpowers).

| File | Source | License | Changes |
|---|---|---|---|
| `agents/silent-failure-hunter.md` | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) `plugins/pr-review-toolkit/agents/silent-failure-hunter.md` at `f8c5e7a` | Apache-2.0 | Rewritten: language-neutral, Anthropic-internal logging conventions removed, read-only, reports real risks only |
| `agents/code-simplifier.md` | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) `plugins/code-simplifier/agents/code-simplifier.md` at `f8c5e7a` | Apache-2.0 | Anthropic house style replaced by "fit the codebase"; runs before review or on request; branch-diff scope; tests before and after; report added |
| `skills/wait-what/SKILL.md` | [mattpocock/skills](https://github.com/mattpocock/skills) `skills/productivity/wait-what/SKILL.md` at `a496f55` | MIT | Glossary reference removed; full sentences required for the re-pitch |
| `skills/ui-review/SKILL.md` | [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) `command.md` at `434b7f9` | MIT | Rules kept in the file instead of fetched at runtime; defaults to the branch's changed UI files; Title Case, `&`, ellipsis and curly-quote rules removed; dashes replaced with plain punctuation |
| `skills/design-canvas/scripts/` (`server.cjs`, `helper.js`, `frame-template.html`, `start-server.sh`, `stop-server.sh`) | [obra/superpowers](https://github.com/obra/superpowers) `skills/brainstorming/scripts/` at 6.4.2 | MIT | Renamed; canvas extended with comments, text edits, drawing, tweaks, history and export; neutral theme and system font; branding and telemetry image removed; session deletion limited to temporary sessions |
