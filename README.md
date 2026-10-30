# larapulse/skills

Personal agent plugin: global coding instructions, code review agents and review workflow skills, shared across devices and accounts. Built to sit next to [superpowers](https://github.com/obra/superpowers), not to replace it.

## Contents

### Global instructions

[`global-rules.md`](global-rules.md): the instructions that would otherwise live in `~/.claude/CLAUDE.md`. They cover reporting style, git branches and commits, migrations, dependencies, comments and code review. Loaded at the start of every session, and again after `/clear` and compaction.

### Agents

| Agent | Runs | Does | Edits code |
|---|---|---|---|
| [`larapulse:code-simplifier`](agents/code-simplifier.md) | Before code review or a merge request, or when asked | Simplifies the branch's changes without changing behaviour; runs the tests before and after | Yes |
| [`larapulse:silent-failure-hunter`](agents/silent-failure-hunter.md) | During code review, or when asked | Reports swallowed errors, unjustified fallbacks and unhelpful error messages | No |

Claude dispatches them on its own at those points, or ask by name ("run code-simplifier").

### Skills

| Skill | Used when | Does |
|---|---|---|
| [`larapulse:mr`](skills/mr/SKILL.md) | Claude writes a merge request description | Keeps it to one or two sentences plus only what the diff doesn't make obvious: env variable names, breaking changes, related merge requests in other repositories. Follows the project's template when there is one. |

Skills load on their own when the task fits; each costs a one-line description in context.

### Commands

| Command | Does |
|---|---|
| [`/larapulse:handoff [purpose]`](skills/handoff/SKILL.md) | Writes a brief of the current work for another agent, by default an independent reviewer. After review feedback, writes a follow-up covering only the new changes. |
| [`/larapulse:review-handoff <brief or path>`](skills/review-handoff/SKILL.md) | Reviews the changes a brief describes in every repository it lists and gives a merge verdict. Fixes minor non-logic issues itself, lists logic findings for the developer. |

A review round: run `/larapulse:handoff` where the code was written, paste the brief into the reviewer (another agent, such as Codex, on any machine) with `/larapulse:review-handoff`, and forward its report back. After fixing, `/larapulse:handoff` again writes the follow-up for the next round.

The short forms `/handoff` and `/review-handoff` work too while no other command uses those names. Commands only run when typed, so their descriptions cost no context.

## Side effects

- **Context**: the global instructions add about 800 tokens to every session, again after `/clear` and compaction.
- **Duplicates**: instructions still present in `~/.claude/CLAUDE.md` (or `~/.codex/AGENTS.md`) load twice. Remove them there.
- **Branches**: on `master`/`main`, Claude creates a feature branch before changing code, unless the project's CLAUDE.md or an explicit instruction says otherwise.
- **Agents**: each run is a subagent with its own context and token cost. `code-simplifier` edits files and runs the project's tests; `silent-failure-hunter` only reads.
- **Handoff files**: briefs and reports longer than about 40 lines go to `.handoff/` in the repository root, which is added to `.git/info/exclude` so it is never committed. Shorter ones are printed in chat.
- **Review fixes**: `/larapulse:review-handoff` fixes minor non-logic issues (typos, stale comments) directly in the reviewer's checkout.
- **Updates**: with auto-update on, every push to `master` reaches every device. There are no version bumps.

## Install

### Claude Code (terminal, desktop, IDE)

Add to `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "larapulse-skills": {
      "source": { "source": "github", "repo": "larapulse/skills" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "larapulse@larapulse-skills": true
  }
}
```

Or from a session: `/plugin marketplace add larapulse/skills`, then `/plugin install larapulse@larapulse-skills`, then `/plugin` → Marketplaces → `larapulse-skills` → Enable auto-update. Third-party marketplaces don't auto-update by default.

- Update by hand: `claude plugin update larapulse@larapulse-skills`
- Remove: `claude plugin uninstall larapulse@larapulse-skills`

### Claude Code in the cloud (claude.ai/code)

Cloud sessions ignore plugin settings from devices and repositories. An organization Owner adds the same JSON in claude.ai → Organization settings → Claude Code → Managed settings. Not yet tested.

### Codex CLI

Codex reads Claude Code plugin manifests, so the global instructions load through the same hook. Not yet tested.

```bash
codex plugin marketplace add larapulse/skills
```

```bash
codex plugin add larapulse@larapulse-skills
```

Then trust the hook in `/hooks`. Codex asks again after every update. Codex updates plugins at startup.

The commands come with the plugin as Codex skills. Agents are not available: Codex agents use a TOML format, and plugins cannot ship them.

### OpenCode

OpenCode doesn't read Claude Code plugins. Point its instructions at the file in `~/.config/opencode/opencode.jsonc`; it always reads the latest version from `master`. Not yet tested.

```json
{
  "instructions": ["https://raw.githubusercontent.com/larapulse/skills/master/global-rules.md"]
}
```

For the commands, link the skill folders where OpenCode looks for skills (a local clone is needed):

```bash
git clone https://github.com/larapulse/skills ~/.larapulse-skills
```

```bash
mkdir -p ~/.config/opencode/skills && ln -s ~/.larapulse-skills/skills/* ~/.config/opencode/skills/
```

Update with `git -C ~/.larapulse-skills pull`. Agents are not available: OpenCode uses a different agent format.

### Other tools

Gemini CLI, Cursor and GitHub Copilot CLI are not set up. Each has its own manifest and hook format.

## Maintaining

Conventions for changing this repo are in [`CLAUDE.md`](CLAUDE.md). Adapted third-party files and their licences: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
