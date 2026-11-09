# Global instructions

The user's own instructions for every project, loaded by the larapulse plugin. Same standing as `~/.claude/CLAUDE.md`.

## Working with me

* When reporting information to me, be extremely concise and sacrifice grammar for the sake of concision. Never drop negations, numbers, exact errors, paths or commands. Use full sentences for questions and options you put to me, security warnings, irreversible actions and step-by-step instructions.
* State the assumptions you work from. When a task is unclear or has several interpretations, stop, say what's unclear, lay out the interpretations and ask; never pick one silently.
* If a simpler approach exists, say so, and push back when a request adds complexity it doesn't need. Suggest features or security checks the task could use, but don't build them unasked.

## Code

* Code should be self-descriptive. Comment only what is non-obvious: WHY, not WHAT, short and focused.
* Neither code nor comments should mention anything from design specifications or implementation plans: they are usually not part of the repo, so do not reference them or their parts, like "This unblocks Part 2 of...".
* Don't hide failures in code: no swallowed errors, catch-all handlers or fallback defaults that mask a failure, unless I ask for that fallback.
* Tests that stay in the codebase guard behavior the code must keep. A test that only proves a one-time change happened (a removal, a rename, reworded text, a cleanup) is fine while you work, but delete it before you finish. Name kept tests after the behavior they guard, not the bug or task that prompted them.
* Never downgrade a package because the new version is incompatible; update the code to work with the latest version instead. Ask before adding a dependency I didn't ask for.
* When I ask you to document a problem/issue/finding, add the info to the codebase directly, probably as a comment, or at least to README if the problem is huge and important to know. Documenting is important to let other developers understand the intent. But do not create separate documentation files for every issue. Be brief and concise, but explanatory and understandable enough.
* While doing code review, check for stale or dead code (including comments) left after implementing the feature, check that changed behavior is tested including error paths, and flag tests that cannot fail or only prove a one-time change happened.

## Data and environments

* Do not use cascading deletes, neither `ON DELETE CASCADE` in migrations nor framework or ORM equivalents: data can be removed without explicit user acknowledgment. Restrict the delete instead, and remove dependent records explicitly in code.
* If you are in a feature branch (not master/main) and need to adjust a migration introduced in the current branch, adjust it instead of creating a new one. Nothing that is not in master/main yet has run anywhere but locally, so it can be safely adjusted; afterwards roll it back and re-run it locally.
* Run commands that change data or infrastructure only against local environments; ask before writing to a shared or remote database, queue, storage or cloud resource, and before any deploy.
* Never change global env variables such as PATH, shell profiles such as `.bashrc`, `.zshrc` or `.profile`, global git config, system services, scheduled jobs or other system-wide files and settings without my explicit permission and a reason why it can't be avoided.
* Install anything globally (`npm -g`, `pip` or `pipx` outside a virtualenv, `go install`, `cargo install`, `brew`, `apt`, installer scripts, SDKs) only after I explicitly agree, and say first what you'll install, where and why. Asking for one tool covers only that tool, not others it needs. Installing a project's own dependencies locally is fine.

## Git and docs

* When I ask you to adjust something in the codebase, ensure you are not in the master/main branch. If you are, create a dedicated branch for the changes and switch to it, unless the project's CLAUDE.md/AGENTS.md or an explicit instruction says otherwise.
* Keep git commit messages to one line of roughly 80 characters, longer only when needed. Add a body only when the why is not obvious, which should be rare.
* After a significant change, update README.md, CLAUDE.md and AGENTS.md wherever they became stale or inconsistent.
* For complex specs and plans, prefer HTML over Markdown when visual structure makes them easier to read and navigate: tabs, illustrations, links, grouped data. Otherwise use Markdown.

## Writing and UI

* Keep docs, specs and other text you write into files short and focused, in full sentences: what the reader needs, said once. No filler, no recaps, nothing the code or a heading already says.
* Use en-US spelling everywhere: "color", "organize", "recognize", "canceled", "behavior", "license".
* Write plain ASCII punctuation and symbols in everything you write (code, UI text, docs, commit messages, replies): straight quotes, `...`, `-`, `->`. Never use typographic Unicode such as curly quotes, the ellipsis character, em or en dashes, arrows, bullets or middle dots. Non-ASCII belongs only where the content needs it, such as non-English text or a real UI symbol.
* In an existing app, its design system and components win over frontend-design's push for a distinctive look; keep that for new standalone surfaces like landing pages and prototypes. Its accessibility and copywriting advice applies everywhere.
