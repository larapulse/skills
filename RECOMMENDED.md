# Recommended companions

Plugins and skills that work well next to the `larapulse` plugin. Each is installed on its own; this plugin doesn't depend on any of them.

Before enabling anything: plugin hooks and MCP servers run with your full access, outside Claude Code's sandbox, and an MCP server that reaches the network is one more way for data to leave. Enable what you use, not everything listed.

## Core

| Plugin | Why |
|---|---|
| [superpowers](https://github.com/obra/superpowers) | The development workflow this plugin builds on: brainstorming, plans, test-driven development, systematic debugging, subagent-driven work and code review. |
| [frontend-design](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) | Deliberate visual design for new UI instead of templated defaults, with an accessibility floor and copywriting rules. This plugin's global instructions limit its push for a distinctive look to new standalone surfaces; inside an existing app, its design system wins. |
| [security-guidance](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/security-guidance) | Catches vulnerable code as Claude writes it. Setup, modes and costs [below](#security-guidance-in-detail). |

All three come from Anthropic's official marketplace, which Claude Code knows by default and keeps updated. Add them to `~/.claude/settings.json`, next to this plugin:

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

## Optional

| Name | Kind | Use when | Watch out for |
|---|---|---|---|
| [claude-security](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-security) | plugin | Periodic deep security audits of a branch or a whole repository | Runs only when you call `/claude-security`. Each scan states its time and token cost and asks before starting. |
| [context7](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/context7) | plugin (MCP) | Claude keeps getting library APIs or versions wrong | Sends your queries to Context7's hosted server (`mcp.context7.com`). The docs it returns come from community-indexed repositories, so treat them as untrusted input. Anonymous use is rate-limited; a `CONTEXT7_API_KEY` raises the limit. |
| [playwright](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/playwright) | plugin (MCP) | Browser testing and screenshots of local apps | Starts `npx @playwright/mcp@latest`, fetched fresh from npm. The browser reaches the network outside the sandbox and outside the secrets guard. |
| [vercel-react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | skill | React and Next.js work: 70 performance rules on request waterfalls, bundle size, server components and re-renders | Its description sits in context every session; most rules target Next.js. |
| [vercel-composition-patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) | skill | Designing reusable React component APIs (compound components, providers, no boolean-prop sprawl) | Its description sits in context every session. |
| [humanizer](https://github.com/blader/humanizer) | plugin (skill only) | Editing or reviewing prose for AI tells: not-X-but-Y contrasts, forced triads, dashes everywhere, inflated claims, stock AI words, bold labels, filler | A third-party marketplace, so it doesn't auto-update unless you turn that on. Its description sits in context every session. |
| [seo-audit](https://github.com/coreyhaines31/marketingskills/tree/main/skills/seo-audit) | skill | Auditing a public website's technical and on-page SEO | Its long description (about 180 tokens) sits in context every session; install it while you need it. |

Plugins from Anthropic's marketplace install like the core ones (`"<name>@claude-plugins-official": true`). humanizer has its own marketplace: `/plugin marketplace add blader/humanizer`, then `/plugin install humanizer@humanizer`, or in settings:

```json
{
  "extraKnownMarketplaces": {
    "humanizer": { "source": { "source": "github", "repo": "blader/humanizer" } }
  },
  "enabledPlugins": { "humanizer@humanizer": true }
}
```

This plugin's global instructions already ban curly quotes, the ellipsis character and dashes in everything Claude writes; humanizer goes further on prose.

Skills install with the [`skills`](https://github.com/vercel-labs/skills) CLI, globally for Claude Code:

```bash
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices -g -a claude-code
```

```bash
npx skills add vercel-labs/agent-skills --skill vercel-composition-patterns -g -a claude-code
```

```bash
npx skills add coreyhaines31/marketingskills --skill seo-audit -g -a claude-code
```

Skills installed this way don't update on their own: run `npx skills update`.

## Code intelligence

Language server plugins give Claude what your editor has: errors and warnings right after each of its edits (type errors, missing imports, syntax errors), and an `LSP` tool that finds definitions and references by symbol instead of by text search. They're optional; tests and builds catch the same errors, only later.

| Language | Plugin | Install the server binary |
|---|---|---|
| Go | [`gopls-lsp`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/gopls-lsp) | `go install golang.org/x/tools/gopls@latest` |
| Python | [`pyright-lsp`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/pyright-lsp) | `npm install -g pyright` or `pipx install pyright` |
| PHP | [`php-lsp`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/php-lsp) | `npm install -g intelephense` |
| JavaScript, TypeScript | [`typescript-lsp`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/typescript-lsp) | `npm install -g typescript-language-server typescript` |
| Rust | [`rust-analyzer-lsp`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/rust-analyzer-lsp) | `rustup component add rust-analyzer` |

A plugin only tells Claude Code how to start the server. Install the binary first and make sure it's on the `PATH` of the shell you start `claude` from (for `go install`, that's `$HOME/go/bin`). Then enable the plugins for your languages:

```json
{
  "enabledPlugins": {
    "gopls-lsp@claude-plugins-official": true,
    "pyright-lsp@claude-plugins-official": true,
    "php-lsp@claude-plugins-official": true,
    "typescript-lsp@claude-plugins-official": true,
    "rust-analyzer-lsp@claude-plugins-official": true
  }
}
```

To check that a server works, ask Claude to introduce a type error in a file of that language: `Found N new diagnostic issues` should appear under the edit. If it doesn't, the Errors tab of `/plugin` shows `Executable not found in $PATH` when the binary is missing.

Watch out for:

- **Terminal only**: cloud sessions don't start language servers.
- **Memory**: a server uses more memory while it indexes the project.
- **Noise**: diagnostics enter the context. Existing warnings, unresolved imports in monorepos, or framework conventions the server doesn't understand add noise; disable a plugin that distracts more than it helps.
- **Intelephense**: some features need its paid licence; diagnostics and go-to-definition work without one.

## Avoid alongside this plugin

- `code-simplifier` and `pr-review-toolkit`: they ship the originals of this plugin's adapted agents, so each agent would exist twice, the original still set to run after every change.
- `code-review`: replaced by Claude Code's built-in `/code-review`, and the two clash on the command name.

## security-guidance in detail

[security-guidance](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/security-guidance) reviews the code Claude writes for vulnerabilities. It complements this plugin's secrets guard: the guard stops secrets from being read or sent out, security-guidance catches vulnerable code being written.

Install with `/plugin install security-guidance@claude-plugins-official`, or add `"security-guidance@claude-plugins-official": true` to `enabledPlugins`. It needs Claude Code 2.1.144 or later and Python 3.8 or later.

### Layers

1. **Pattern warnings**: regex checks on every Edit and Write for 25 known-dangerous calls in Python, JavaScript/TypeScript and Go, such as `pickle`, `yaml.load`, `shell=True`, `child_process.exec`, `innerHTML` and disabled TLS verification. No model call; a match adds a short warning to the session and Claude fixes the code or explains why it is safe.
2. **Turn-end review**: after every turn that changed code, a separate model call (the newest Opus by default) reviews the turn's diff and the related file contents. Serious findings wake the session, and Claude fixes them.
3. **Commit/push review**: on `git commit` and `git push`, an agent reads the files around the change and traces data flow, catching problems that span files (IDOR, authorization bypass, SSRF). Findings wake the session the same way.

### Modes

Set in the `env` block of `~/.claude/settings.json`:

| Mode | Setting | Layers | Extra cost |
|---|---|---|---|
| Full (default) | none | 1, 2, 3 | One review per code-changing turn, plus one agent run per commit or push. The plugin's own example of a turn-end review: about 32k tokens in and 3k out, roughly $0.19 at Opus list prices. Commit/push runs are not quantified upstream. |
| Commit review | `"ENABLE_STOP_REVIEW": "0"` | 1, 3 | One agent run per commit or push |
| Patterns only | `"ENABLE_CODE_SECURITY_REVIEW": "0"` | 1 | None |
| Off | `"SECURITY_GUIDANCE_DISABLE": "1"` | none | None |

Reviews are billed to your API key or count against your subscription's usage limits, and they don't appear in Claude Code's own cost display. Fixes Claude makes in response add turns to your session. To pay less, point `SECURITY_REVIEW_MODEL` (turn-end) or `SG_AGENTIC_MODEL` (commit/push) at a cheaper model such as Sonnet; upstream notes it gives more false positives. Each review's token usage and estimated cost are logged in `~/.claude/security/log.txt`.

For review without the automatic cost, Claude Code's built-in `/security-review` runs the same kind of check on demand.

### Customizing without forking

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

### Side effects

- The first session creates a virtual environment in `~/.claude/security/agent-sdk-venv` and installs the Claude Agent SDK for the commit/push reviewer: 30 to 60 seconds, network required.
- Model reviews send the diff and related file contents to the same model endpoint your Claude Code uses.
- Its hooks run with your full access, outside the sandbox.
