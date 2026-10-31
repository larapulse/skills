# larapulse/skills

Personal agent plugin: global coding instructions, a secrets guard, code review agents and review workflow skills, shared across devices and accounts. Built to sit next to [superpowers](https://github.com/obra/superpowers), not to replace it.

## Contents

### Global instructions

[`global-rules.md`](global-rules.md): the instructions that would otherwise live in `~/.claude/CLAUDE.md`. They cover reporting style, git branches and commits, migrations, dependencies, comments and code review. Loaded at the start of every session, and again after `/clear` and compaction.

### Secrets guard

[`hooks/protect-secrets.py`](hooks/protect-secrets.py) runs before every Read, Grep and Bash call, subagents included, and denies:

- **Reading secrets**: `.env` and `.env.*` (`.env.local` and `.env.example`, `.sample`, `.dist`, `.template` stay readable), private keys (`id_*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`), Composer `auth.json`, and credential stores in the home directory: `~/.ssh` (except `config`, `known_hosts`, `*.pub`), `~/.gnupg`, `~/.aws`, `~/.azure`, `~/.config/gcloud`, `~/.kube`, Docker, Git and npm credentials, `~/.netrc`, `~/.pypirc`, `gh` and `glab` configs, and the Claude and Codex auth files.
- **Remote shells and transfers**: `ssh`, `scp`, `sftp`, `rsync`, `sshpass`, `mosh`, `autossh`, also behind `sudo`, `timeout` or `env` and inside `bash -c`, `eval` or `$(…)`.
- **Uploads**: `curl` and `wget` sending data (`-d`, `--data*`, `--json`, `-F`, `-T`, `--post-*`, `--body-*`, or a method other than GET or HEAD). Downloads stay allowed.

Claude gets the reason and asks you instead. It is a guardrail, not a sandbox: indirect reads such as `printenv` or scripts that load `.env` themselves are not caught.

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
| [`/larapulse:wait-what`](skills/wait-what/SKILL.md) | Re-pitches the last message with the missing context, in full sentences of plain English, when a terse report didn't land. |

A review round: run `/larapulse:handoff` where the code was written, paste the brief into the reviewer (another agent, such as Codex, on any machine) with `/larapulse:review-handoff`, and forward its report back. After fixing, `/larapulse:handoff` again writes the follow-up for the next round.

The short forms `/handoff`, `/review-handoff` and `/wait-what` work too while no other command uses those names. Commands only run when typed, so their descriptions cost no context.

## Side effects

- **Context**: the global instructions add about 800 tokens to every session, again after `/clear` and compaction.
- **Duplicates**: instructions still present in `~/.claude/CLAUDE.md` (or `~/.codex/AGENTS.md`) load twice. Remove them there.
- **Branches**: on `master`/`main`, Claude creates a feature branch before changing code, unless the project's CLAUDE.md or an explicit instruction says otherwise.
- **Agents**: each run is a subagent with its own context and token cost. `code-simplifier` edits files and runs the project's tests; `silent-failure-hunter` only reads.
- **Handoff files**: briefs and reports longer than about 40 lines go to `.handoff/` in the repository root, which is added to `.git/info/exclude` so it is never committed. Shorter ones are printed in chat.
- **Review fixes**: `/larapulse:review-handoff` fixes minor non-logic issues (typos, stale comments) directly in the reviewer's checkout.
- **Secrets guard**: about 30 ms per Read, Grep and Bash call, and no tokens unless it blocks. It needs `python3`: without it, every Read, Grep and Bash call is blocked until it is installed. `cp .env.example .env` is blocked as well; run it yourself.
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

Then trust the hooks in `/hooks`. Codex asks again after every update. Whether Codex runs the secrets guard is not verified. Codex updates plugins at startup.

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

## Recommended companion plugins

Installed on their own from Anthropic's official marketplace, not part of this plugin. That marketplace is known to Claude Code by default and its plugins update automatically.

| Plugin | Why |
|---|---|
| [superpowers](https://github.com/obra/superpowers) | The development workflow this plugin builds on: brainstorming, plans, test-driven development, systematic debugging, subagent-driven work and code review. |
| [frontend-design](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) | Deliberate visual design for new UI instead of templated defaults, with an accessibility floor and copywriting rules. The global instructions limit its push for a distinctive look to new standalone surfaces; inside an existing app, its design system wins. |
| [security-guidance](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/security-guidance) | Catches vulnerable code as Claude writes it. Setup, modes and costs below. |

Add them to `~/.claude/settings.json`, next to this plugin:

```json
{
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "frontend-design@claude-plugins-official": true,
    "security-guidance@claude-plugins-official": true
  }
}
```

Or from a session: `/plugin install <name>@claude-plugins-official` for each.

Avoid these alongside this plugin:

- `code-simplifier` and `pr-review-toolkit`: they ship the originals of this plugin's adapted agents, so each agent would exist twice, the original still set to run after every change.
- `code-review`: replaced by Claude Code's built-in `/code-review`, and the two clash on the command name.

### security-guidance

[security-guidance](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/security-guidance) reviews the code Claude writes for vulnerabilities. It complements the secrets guard above: the guard stops secrets from being read or sent out, security-guidance catches vulnerable code being written.

Install with `/plugin install security-guidance@claude-plugins-official`, or add `"security-guidance@claude-plugins-official": true` to `enabledPlugins`. It needs Claude Code 2.1.144 or later and Python 3.8 or later.

#### Layers

1. **Pattern warnings**: regex checks on every Edit and Write for 25 known-dangerous calls in Python, JavaScript/TypeScript and Go, such as `pickle`, `yaml.load`, `shell=True`, `child_process.exec`, `innerHTML` and disabled TLS verification. No model call; a match adds a short warning to the session and Claude fixes the code or explains why it is safe.
2. **Turn-end review**: after every turn that changed code, a separate model call (the newest Opus by default) reviews the turn's diff and the related file contents. Serious findings wake the session, and Claude fixes them.
3. **Commit/push review**: on `git commit` and `git push`, an agent reads the files around the change and traces data flow, catching problems that span files (IDOR, authorization bypass, SSRF). Findings wake the session the same way.

#### Modes

Set in the `env` block of `~/.claude/settings.json`:

| Mode | Setting | Layers | Extra cost |
|---|---|---|---|
| Full (default) | none | 1, 2, 3 | One review per code-changing turn, plus one agent run per commit or push. The plugin's own example of a turn-end review: about 32k tokens in and 3k out, roughly $0.19 at Opus list prices. Commit/push runs are not quantified upstream. |
| Commit review | `"ENABLE_STOP_REVIEW": "0"` | 1, 3 | One agent run per commit or push |
| Patterns only | `"ENABLE_CODE_SECURITY_REVIEW": "0"` | 1 | None |
| Off | `"SECURITY_GUIDANCE_DISABLE": "1"` | none | None |

Reviews are billed to your API key or count against your subscription's usage limits, and they don't appear in Claude Code's own cost display. Fixes Claude makes in response add turns to your session. To pay less, point `SECURITY_REVIEW_MODEL` (turn-end) or `SG_AGENTIC_MODEL` (commit/push) at a cheaper model such as Sonnet; upstream notes it gives more false positives. Each review's token usage and estimated cost are logged in `~/.claude/security/log.txt`.

For review without the automatic cost, Claude Code's built-in `/security-review` runs the same kind of check on demand.

#### Customizing without forking

Two files extend it. Each is read from `~/.claude/` (you), `<project>/.claude/` (committed for the team) and `<project>/.claude/<name>.local.<ext>` (local, gitignored):

- `security-patterns.json`: up to 50 extra regex rules for the pattern layer, useful for languages or APIs the built-ins skip. `paths` and `exclude_paths` take globs.

  ```json
  {
    "patterns": [
      {
        "rule_name": "weak_hash",
        "regex": "\\b(md5|sha1)\\s*\\(",
        "exclude_paths": ["**/tests/**", "**/*_test.*"],
        "reminder": "MD5 and SHA-1 are broken for passwords and signatures. Use a password hasher (bcrypt, argon2) for passwords and SHA-256 or better elsewhere."
      }
    ]
  }
  ```

- `claude-security-guidance.md`: up to 8 KB of house rules appended to every model review, for example "every query on tenant data filters by tenant ID". It can add checks but never suppress findings, so a repo can't switch reviews off through it.

#### Side effects

- The first session creates a virtual environment in `~/.claude/security/agent-sdk-venv` and installs the Claude Agent SDK for the commit/push reviewer: 30 to 60 seconds, network required.
- Model reviews send the diff and related file contents to the same model endpoint your Claude Code uses.
- Its hooks run with your full access, outside the sandbox.

## Maintaining

Conventions for changing this repo are in [`CLAUDE.md`](CLAUDE.md). Adapted third-party files and their licences: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
