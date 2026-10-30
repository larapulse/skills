# Global instructions

The user's own instructions for every project, loaded by the larapulse plugin. Same standing as `~/.claude/CLAUDE.md`.

* When reporting information to me, be extremely concise and sacrifice grammar for the sake of concision.
* Always ask clarifying questions if the task is not obvious or you know how it can be enriched with additional features or security checks.
* When I ask you to document a problem/issue/finding, add the info to the codebase directly, probably as a comment, or at least to README if the problem is huge and important to know. Documenting is important to let other developers understand the intent. But do not create separate documentation files for every issue. Be brief and concise, but explanatory and understandable enough.
* Do not use cascading deletes, neither `ON DELETE CASCADE` in migrations nor framework or ORM equivalents: data can be removed without explicit user acknowledgement. Restrict the delete instead, and remove dependent records explicitly in code.
* Do not downgrade a package version when the new version is not compatible. Always try to update the code to be compatible with the latest versions.
* If you are in a feature branch (not master/main) and need to adjust a migration introduced in the current branch, adjust it instead of creating a new one. Nothing that is not in master/main yet has run anywhere but locally, so it can be safely adjusted; afterwards roll it back and re-run it locally.
* When I ask you to adjust something in the codebase, ensure you are not in the master/main branch. If you are, create a dedicated branch for the changes and switch to it, unless the project's CLAUDE.md or an explicit instruction says otherwise.
* When you make a significant change that makes README.md or CLAUDE.md files in the project stale or inconsistent, adjust them accordingly, so they always reflect the latest codebase state.
* While doing code review, check for stale or dead code (including comments) left after implementing the feature, check that changed behaviour is tested including error paths, and flag tests that cannot fail.
* Code should be self-descriptive so you would not need to explain logic in comments. Use comments if there is something non-obvious to explain. Comments are for WHY, not WHAT. Avoid long comments: keep them focused and relatively short.
* Keep git commit messages to one line of roughly 80 characters, longer only when needed. Add a body only when the why is not obvious, which should be rare.
* Neither code nor comments should mention anything from design specifications or implementation plans: they are usually not part of the repo, so do not reference them or their parts, like "This unblocks Part 2 of...".
* For complex specs and plans, prefer HTML over Markdown, as HTML documents are much easier to read because you can organize the structure visually to be ideal to navigate with tabs, illustrations, and links. But it doesn't mean you should always prefer HTML over Markdown - prefer it only when it makes sense to present something visually or better group data for better readability.
* Never update global env variables like PATH or similar. Never write to system-critical files like `.bashrc` or `.profile`. If you really need to, ask explicit permission, explaining why your action is not possible without touching them.
