# Issue tracker

Use GitHub issues in `amirweb2022/boiler-crm` for issue tracking and wayfinding. Give every `gh issue` command the explicit repository argument so it works from a directory without a Git remote. Install and authenticate GitHub CLI before running issue operations.

## Find an issue

```sh
gh issue list -R amirweb2022/boiler-crm --state open
gh issue list -R amirweb2022/boiler-crm --search "search terms"
gh issue view 123 -R amirweb2022/boiler-crm
```

Check existing issues before opening a new one. Link the relevant issue number when recording work or a decision.

## Maintain an issue

```sh
gh issue create -R amirweb2022/boiler-crm --title "Short summary" --body "Expected behavior, actual behavior, and relevant context"
gh issue edit 123 -R amirweb2022/boiler-crm --add-label needs-triage
gh issue comment 123 -R amirweb2022/boiler-crm --body "Progress or information needed"
gh issue close 123 -R amirweb2022/boiler-crm --comment "Resolution"
gh issue reopen 123 -R amirweb2022/boiler-crm
```

Use [triage-labels.md](triage-labels.md) for the default labels. This configuration covers issues only; PR triage is off.
