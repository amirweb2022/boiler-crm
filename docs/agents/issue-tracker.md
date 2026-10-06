# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`; fetch labels when needed.
- List: `gh issue list --state open` with appropriate state and label filters.
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill operations

When a skill says "publish to the issue tracker", create a GitHub issue.
When a skill says "fetch the relevant ticket", run `gh issue view <number> --comments`.

## Wayfinding operations

For `/wayfinder`, use a GitHub issue labelled `wayfinder:map` as the map.
Link child tickets as sub-issues when available; otherwise use a task list
in the map and `Part of #<map>` in each child. Label children
`wayfinder:<type>` (`research`, `prototype`, `grilling`, or `task`).
Use native issue dependencies for blockers when available; otherwise put
`Blocked by: #<n>` at the top of the child. The frontier is the first
unassigned, unblocked, open child in map order. Claim it with
`gh issue edit <n> --add-assignee @me`. On resolution, comment with
the answer, close the child, and add a context pointer to the map.
