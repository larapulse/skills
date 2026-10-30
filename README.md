# larapulse/skills

Personal agent plugin: global coding instructions and code review agents, shared across devices and accounts. Built to sit next to [superpowers](https://github.com/obra/superpowers), not to replace it.

## Contents

### Global instructions

[`global-rules.md`](global-rules.md): the instructions that would otherwise live in `~/.claude/CLAUDE.md`. They cover reporting style, git branches and commits, migrations, dependencies, comments and code review. Loaded at the start of every session, and again after `/clear` and compaction.

### Agents

| Agent | Runs | Does | Edits code |
|---|---|---|---|
| [`larapulse:code-simplifier`](agents/code-simplifier.md) | Before code review or a PR, or when asked | Simplifies the branch's changes without changing behaviour; runs the tests before and after | Yes |
| [`larapulse:silent-failure-hunter`](agents/silent-failure-hunter.md) | During code review, or when asked | Reports swallowed errors, unjustified fallbacks and unhelpful error messages | No |

Claude dispatches them on its own at those points, or ask by name ("run code-simplifier").

### Skills and commands

None yet.

## Side effects

- **Context**: the global instructions add about 800 tokens to every session, again after `/clear` and compaction.
- **Duplicates**: instructions still present in `~/.claude/CLAUDE.md` (or `~/.codex/AGENTS.md`) load twice. Remove them there.
- **Branches**: on `master`/`main`, Claude creates a feature branch before changing code, unless the project's CLAUDE.md or an explicit instruction says otherwise.
- **Agents**: each run is a subagent with its own context and token cost. `code-simplifier` edits files and runs the project's tests; `silent-failure-hunter` only reads.
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

Agents are not available: Codex agents use a TOML format, and plugins cannot ship them.

### OpenCode

OpenCode doesn't read Claude Code plugins. Point its instructions at the file in `~/.config/opencode/opencode.jsonc`; it always reads the latest version from `master`. Not yet tested.

```json
{
  "instructions": ["https://raw.githubusercontent.com/larapulse/skills/master/global-rules.md"]
}
```

Agents are not available: OpenCode uses a different agent format.

### Other tools

Gemini CLI, Cursor and GitHub Copilot CLI are not set up. Each has its own manifest and hook format.

## Maintaining

Conventions for changing this repo are in [`CLAUDE.md`](CLAUDE.md). Adapted third-party files and their licences: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
