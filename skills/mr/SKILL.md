---
name: mr
description: Use when writing a merge request description.
---

The reviewer reads the diff; the description only points out what the diff doesn't make obvious. If the project has a merge request template (`.gitlab/merge_request_templates/`), follow it.

Start with one or two sentences: what the change does and why, with the issue link if there is one. Then add only the sections that apply, and omit the rest:

- **Environment**: names of env variables added, renamed or removed.
- **Breaking changes**: what consumers of an API, event or schema must change.
- **Related merge requests**: changes in other repositories, and the order to merge them.

Leave out what the diff shows: no file-by-file walkthrough, no restating code, and no test plan unless testing needs manual steps.
