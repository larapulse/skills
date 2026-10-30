---
name: handoff
description: Summarises the current work into a brief for another agent, by default an independent reviewer.
argument-hint: "[purpose: review (default), or continue elsewhere]"
disable-model-invocation: true
---

Write a brief of the current work for an agent that has the repository but not this conversation. The arguments give its purpose; without one, it is an independent code review.

## Content

- **Intent**: what was asked and why, in the user's words where possible.
- **Scope**: per repository, the branch, base and head commit, with the command that shows the diff. Changed files with one line of purpose each; leave the diff itself out.
- **Decisions**: choices made, alternatives rejected, and why.
- **Verification**: what was tested (commands and results) and what was not.
- **Focus**: where the change is most likely wrong and deserves scrutiny.
- **Open questions**: anything still undecided.

For continuing work rather than review, replace Focus with **Next steps** and name the skills the next agent should use.

## After a review

When reviewer feedback came in since the last brief, write a follow-up instead:

- **Feedback**: each finding and what was done about it, either the change made or why it was left.
- **Scope**: the diff from the previous brief's head commit, so the reviewer sees only the new changes.
- Intent shrinks to one line; carry over only the open questions still open.

## Output

Up to about 40 lines: print the brief in chat as one fenced Markdown block, ready to paste. Longer: save it to `.handoff/<branch>.md` in the repository root, add `.handoff/` to `.git/info/exclude`, and print the path.

## Rules

- Point to specs, plans, issues and commits by path or URL instead of copying them.
- State facts, not a verdict: the reviewer judges the change independently.
- Redact secrets and personal data.
