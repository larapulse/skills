# larapulse/skills

Personal Claude Code plugin: global instructions plus code review agents, shared across devices and accounts. Built to sit next to [superpowers](https://github.com/obra/superpowers), not to replace it.

## Install

Add this to `~/.claude/settings.json` on each device:

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

Every push to `master` is a new version, and `autoUpdate` pulls it (third-party marketplaces don't auto-update by default). Then remove the same instructions from `~/.claude/CLAUDE.md`, or they load twice.

Cloud sessions (claude.ai/code) ignore device and repo settings: put the same JSON in claude.ai → Organization settings → Claude Code → Managed settings.

## Contents

- `global-rules.md`: global instructions, injected into every session by `hooks/hooks.json`.
- `agents/code-simplifier.md`: simplifies the branch's changes before review.
- `agents/silent-failure-hunter.md`: reviews error handling for hidden failures.
