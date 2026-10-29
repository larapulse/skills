# Evaluation: Anthropic and Matt Pocock skills

Date: 2026-10-29

Sources read in full (every `SKILL.md`, plus the reference files that decide behaviour):

- `anthropics/skills@ca45fc4` (2026-10-28), 19 skills
- `mattpocock/skills@a496f55` (plugin v1.3.2, 2026-10-29), 38 skills across `engineering/`, `productivity/`, `misc/`, `in-progress/`

Baseline these were judged against:

- **superpowers 6.4.2** (installed, stays): brainstorming, writing-plans, executing-plans, subagent-driven-development, test-driven-development, systematic-debugging, verification-before-completion, requesting/receiving-code-review, using-git-worktrees, finishing-a-development-branch, dispatching-parallel-agents, writing-skills.
- **Claude Code built-ins**: `/code-review`, `/simplify`, `/security-review`, `run`, `init`, `claude-api`, and the `frontend-design` plugin.

## Verdicts

- **Adopt**: fork into this repo and adapt.
- **Upstream**: keep using the upstream copy, don't fork (fast-moving or already shipped to you).
- **Maybe**: worth it only if an open question below resolves a certain way.
- **Skip**: not dev-focused, or superpowers / Claude Code already covers it.

## Matt Pocock (MIT)

### Adopt

| Skill | What it does | Why it earns a place | Adaptation needed |
|---|---|---|---|
| `codebase-design` | Deep-module vocabulary (module, interface, seam, depth, leverage, locality), the deletion test, "design it twice" with parallel subagents | Nothing in superpowers gives design vocabulary; it sharpens brainstorming and code review | Swap TS examples for your stack |
| `domain-modeling` | Keeps `GLOSSARY.md` and ADRs current; challenges fuzzy or overloaded terms against the glossary and the code | Superpowers writes specs, never a shared language. Brainstorming plus this gives you `grill-with-docs` without its grilling cadence | Have brainstorming pull it in |
| `improve-codebase-architecture` | Finds hot spots from git history, renders an HTML report of deepening candidates, then designs the chosen one | Periodic codebase-health pass; nothing equivalent installed | Replace its `grilling` step with brainstorming; write the report where a cloud session can show it, since OS temp plus `xdg-open` never reaches you there |
| `pr` | PR body shape: smallest visual that explains the change, before/after evidence, one-way or two-way door plus blast radius | Big quality jump for PR bodies; no overlap | Merge with your own PR conventions; keep its credit to Dex Horthy (HumanLayer `show-me`) |
| `retro` | After a session, proposes environment fixes (lint rules, checks, coding standards, steering files), most severe first | Turns repeated agent mistakes into guardrails; no overlap (`diagnosing-superpowers` only audits superpowers itself) | Point findings at this repo and per-project standards |
| `handoff` | Compacts the session into a portable handoff doc with suggested skills | Directly serves "across devices and accounts" | Save somewhere that survives an ephemeral container (commit or push), not `$TMPDIR` |
| `writing-for-agents` | Reference for writing skills and CLAUDE.md: context pointers, leading words, no-ops, negation, progressive disclosure | This repo *is* skills, so it becomes our house style guide. Complements superpowers `writing-skills` (TDD for skills) and Anthropic `skill-creator` (evals) | Minimal |

### Maybe

| Skill | What it does | Decides it |
|---|---|---|
| `to-tickets` | Spec into vertical-slice tickets with blocking edges, as GitHub issues or local files | Only if GitHub Issues is where you plan work. It would take a superpowers spec as input and partly overlaps `writing-plans` |
| `triage` | Issue state machine (needs-triage, needs-info, ready-for-agent, ...) with agent briefs | Only if you maintain repos with inbound issues |
| `wayfinder` | Huge, foggy efforts charted as a map of decision tickets on the tracker | Heavy and tracker-bound. Only for multi-week greenfield work |
| `code-review` | Two-axis review in parallel subagents: Standards (repo rules plus a Fowler smell baseline) and Spec (did it build what was asked) | Overlaps superpowers review, and its name collides with Claude Code's `/code-review`. If kept, rename it and keep only the additive parts (Spec axis, smell baseline) |
| `wizard` | Generates an interactive bash script for steps only a human can do: secrets, dashboards, cutovers | Worth it if you set up many third-party services |
| `research` | Background agent researches primary sources, leaves a cited Markdown file in the repo | Small. Adopt if you want research notes kept in repos (like this file) |
| `prototype` | Throwaway logic demo (single HTML) or several UI variants switchable on one route | For UI-heavy work. Brainstorming's spike path has no prototype recipe |
| `wait-what` | "Re-pitch that in plain English" | Tiny, user-invoked, zero context cost |
| `to-questionnaire` | Questionnaire for a stakeholder to fill in async | Only if you often wait on other people's answers |
| `git-guardrails-claude-code` (misc) | PreToolUse hook blocking `git push`, `reset --hard`, `clean -f`, ... | Belongs in plugin hooks, not a skill. Blocking push conflicts with cloud sessions, which must push |

### Skip

| Skill | Reason |
|---|---|
| `grilling`, `grill-me`, `grill-with-docs` | Same job as brainstorming, opposite cadence (whole question frontier per round vs one question at a time). Running both makes them fight over the same triggers |
| `tdd` | Covered by superpowers `test-driven-development`. Ideas to borrow: agree test seams before writing tests; "tautological test" anti-pattern |
| `diagnosing-bugs` | Covered by `systematic-debugging`. Ideas to borrow: no hypothesis until a fast, deterministic, red-capable repro command exists; tagged `[DEBUG-xxxx]` logs for one-grep cleanup |
| `to-spec`, `implement`, `implement-spec` | Covered by brainstorming, writing-plans, executing-plans, subagent-driven-development |
| `ask-matt` | Router over Matt's own flow. Write our own router if this set ever outgrows memory |
| `setup-matt-pocock-skills` | Per-repo config indirection (tracker, labels, doc layout). Replace with fixed conventions baked into our skills |
| `teach` | Not dev |
| `setup-pre-commit`, `setup-ts-deep-modules` | Husky/Prettier and dependency-cruiser are JS/TS-specific. Revisit only if that's your stack |
| `migrate-to-shoehorn`, `scaffold-exercises`, `claude-handoff`, `chief-of-staff`, `loop-me`, `writing-beats`, `writing-fragments`, `writing-shape` | Niche to Matt's own work, or unshipped beta |

## Anthropic (Apache-2.0, except the document skills)

| Skill | Verdict | Reason |
|---|---|---|
| `skill-creator` | Upstream | Drafts skills, runs with-vs-without evals, optimises description triggering. Already on your account as `anthropic-skills:skill-creator`. We use it to build and test this repo, not fork it (large script suite) |
| `mcp-builder` | Upstream, if you build MCP servers | Fast-moving: switched to the MCP TypeScript SDK v2 on 2026-10-28, so a fork goes stale. Caveat: it ships inside the `example-skills` plugin with 11 other skills, mostly non-dev (art, Slack GIFs, themes, ...), so installing it for one skill adds noise. Alternative: vendor it with a sync script |
| `webapp-testing` | Maybe, adapt | Python Playwright with a `with_server.py` lifecycle helper. Overlaps Claude Code's `run` skill. Worth adapting to your stack's E2E tooling if browser checks matter |
| `doc-coauthoring` | Skip, borrow one idea | Mostly overlaps brainstorming's spec writing. Its "reader testing" stage (a fresh subagent reads the doc cold and answers predicted questions) is worth borrowing for spec review |
| `frontend-design`, `claude-api` | Skip | Already shipped to you (plugin / Claude Code built-in) |
| `web-artifacts-builder` | Skip | Builds claude.ai artifacts, not product code |
| `docx`, `pdf`, `pptx`, `xlsx` | Skip | Proprietary licence (no forking or redistribution); already on your account |
| `algorithmic-art`, `canvas-design`, `slack-gif-creator`, `theme-factory`, `brand-guidelines`, `internal-comms`, `academy-guide`, `discernment-nudge` | Skip | Not dev (`discernment-nudge` explicitly skips coding tasks) |

## Cross-cutting adjustments

1. **Cherry-pick, never install `mattpocock-skills` wholesale next to superpowers.** `tdd`, `diagnosing-bugs`, `grilling` and `implement` compete with superpowers for the same triggers. `code-review`, `research` and `prototype` collide with Claude Code built-ins, and upstream refuses to rename (`.out-of-scope/harness-name-collisions.md`).
2. **Remove the setup indirection.** Every Matt engineering skill says "the issue tracker should have been provided to you; if not, run `/setup-matt-pocock-skills`". Our copies state the conventions directly.
3. **Re-point the handoffs.** Matt's skills call `grilling` for design conversations; ours call superpowers `brainstorming`, so one interview style runs everywhere.
4. **One file layout.** Superpowers writes `docs/superpowers/specs/` and `docs/superpowers/plans/`. Domain modeling adds `GLOSSARY.md` and `docs/adr/`. Nothing else invents its own location.
5. **Cloud-session reality.** Anything written to OS temp or opened with `xdg-open` is invisible from the Claude app. Write to a visible location, or commit.
6. **Licences.** Forked Matt skills keep the MIT copyright notice. Forked Anthropic skills keep the Apache-2.0 licence and note what changed. Proprietary document skills are never copied.

## Distribution across accounts and devices

| Option | Reaches | Notes |
|---|---|---|
| A. This repo as a Claude Code plugin marketplace (`.claude-plugin/marketplace.json`) | Claude Code on every device; likely cloud sessions too | Add once with `/plugin marketplace add larapulse/skills`, then install; updates arrive through the plugin manager. In this cloud session superpowers loads from an account-synced plugin directory, so a plugin from this repo may ride the same path (to verify). **Recommended primary** |
| B. Symlink script into `~/.claude/skills` and `~/.agents/skills` | One machine, from a local clone | Best while editing skills: changes are live without reinstalling |
| C. `npx skills add larapulse/skills` | Codex, Cursor, OpenCode and other Agent Skills harnesses | Only if you use agents besides Claude |
| D. Zip upload to claude.ai Skills | claude.ai chat | Per account, manual |

## Open questions

1. Stack(s) you build in: decides examples in `codebase-design`, and whether `webapp-testing`, `setup-pre-commit` or `setup-ts-deep-modules` come back.
2. Planning surface: GitHub Issues, or specs and plans in the repo: decides `to-tickets`, `triage` and `wayfinder`.
3. Harnesses besides Claude Code: decides whether option C is needed.
