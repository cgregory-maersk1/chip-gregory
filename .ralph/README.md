# Ralph loop template

A tiny bash loop that drives Claude Code over a PRD until the PRD is complete. One commit per feature, one log entry per iteration.

## What's in here

| File | Purpose |
|---|---|
| `ralph.sh` | The loop. Iterates N times, each time asking Claude to pick the highest-priority unfinished PRD item, build it, run checks, update the PRD, append to `progress.md`, and commit. |
| `prd.example.json` | Schema example. Copy to `prd.json` in your project's `.ralph/` and fill it in. |
| `progress.md` | Append-only progress log. Claude writes a note to it every iteration. |

## How to spin up a new project

From the workspace root, in **PowerShell**:

```powershell
.\new-project.ps1 -Name <your-project>      # add -Public for a public repo
```

This scaffolds `.ralph/`, runs `git init`, and **creates + pushes a private GitHub repo under
`cgregory-maersk1/<your-project>`** via `gh`. (One-time setup: `gh auth login`.)

Then write a real `.ralph/prd.json` (Claude can generate this from a vague brief), and run the loop:

```powershell
# PowerShell, from the project root
.\.ralph\ralph.ps1 -Iterations 5
```

A bash `ralph.sh` is also included for portability (`bash .ralph/ralph.sh 5`), but PowerShell is
the default — no Git Bash required.

## PRD schema

`.ralph/prd.json` is a JSON array of feature objects:

```json
[
  {
    "category": "ui",
    "description": "Render the heatmap grid with placeholder data",
    "steps": ["create index.html", "add a 6x5 table", "fill with sample numbers"],
    "passes": false
  }
]
```

- `category` — free-form tag (e.g. `ui`, `data`, `polish`).
- `description` — one-line summary of the feature.
- `steps` — sub-steps Claude can use as a checklist.
- `passes` — set to `true` once the feature is done; Claude skips `passes: true` items.

## How the loop ends

The script exits early when Claude emits either:

- `<PROMISE>COMPLETE</PROMISE>` — PRD is done.
- `<PROMISE>NEED_PERMISSIONS</PROMISE>` — Claude needs an additional permission. Add it to `.claude/settings.local.json` and re-run.

Otherwise the loop runs the full N iterations you passed in.

## Tips

- **Keep features tiny.** Each iteration is one Claude call; small features = visible progress.
- **One commit per feature** means `git log` is your audit trail; `git reset` undoes a bad iteration.
- **Run from PowerShell** with `.\.ralph\ralph.ps1 -Iterations <n>` — no Git Bash needed. The
  script shells out to `claude`, which must be on your `PATH`.
