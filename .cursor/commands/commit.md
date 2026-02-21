---
name: commit
description: Stage, summarize, and commit all current changes to git with a structured message
---

Run `git status` and `git diff` to review all current changes. Then stage everything with `git add .` and write a commit message in this format:

```
<short one-line summary of the overall change (max 72 chars)>

- <one bullet per logical change>
- <keep each bullet to one concise sentence>
- <use present tense: "Add", "Fix", "Remove", not past tense>
```

Use the diff to infer what actually changed — do not use vague messages like "various updates". After committing, confirm success and ask if the user wants to push.
