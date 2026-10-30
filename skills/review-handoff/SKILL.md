---
name: review-handoff
description: Reviews the changes a handoff brief describes and writes a report for the developer.
argument-hint: "<handoff brief, or path to one>"
disable-model-invocation: true
---

Review the changes described in the handoff brief from the arguments (text or a path), in every repository it lists. Are they good to be merged and released as is, or does something important need to be addressed first: improved, adjusted, fixed or modified?

- Fix minor issues yourself: typos, stale comments, anything else not critical that doesn't touch logic.
- List everything related to logic without changing it. The developer knows more about the implementation and the acceptance criteria, so they decide.
- Don't over-complicate and don't nitpick.
- For a follow-up brief, review only the changes since the previous review, and check that each earlier finding was addressed or deliberately left.

## Report

Written for the developer's coding agent, which wasn't part of this review:

1. **Verdict**: good to merge and release as is, or address first.
2. **Address first**: per finding, its location (repository, file, line), the problem, why it matters, and a suggested direction.
3. **Fixed**: the minor fixes made, with their `git diff` when the developer works in a different checkout.

Up to about 40 lines: print the report in chat as one fenced Markdown block, ready to forward. Longer: save it to `.handoff/review-<branch>.md` in the repository root, add `.handoff/` to `.git/info/exclude`, and print the path.
