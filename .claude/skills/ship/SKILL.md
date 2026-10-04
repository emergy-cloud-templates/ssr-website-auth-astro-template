---
name: ship
description: Verify, commit and push the current work so the Build workflow deploys it to the dev environment. Use when the user says "ship it", "commit and push", "deploy my changes to dev", or runs /ship.
argument-hint: "[optional commit message or intent]"
disable-model-invocation: true
---

# Ship the current work

Pushing a branch triggers the Build workflow, which verifies, builds and
deploys the branch to the `dev` environment. Follow these steps in order and
stop at the first failure.

1. **Branch.** Run `git branch --show-current`. If it is `main` (or detached),
   create a branch named after the change: `git switch -c <type>/<short-slug>`
   (e.g. `feat/project-list`). Never commit to `main`.
2. **Review the changes.** `git status` and `git diff` (plus `git diff --staged`).
   Make sure nothing secret is included: no `.env*` (except `.env.example`),
   `deploy.env`, `*.tfstate`, `*.tfvars`, keys, tokens or account IDs. If you
   find any, stop and tell the user.
3. **Verify.** In `website/`: `pnpm format`, then `pnpm verify`. If
   `infrastructure/` changed: `terraform fmt -recursive` and
   `terraform init -backend=false && terraform validate && terraform test` in
   `infrastructure/` (skip with a note if Terraform is not installed). Fix
   failures caused by the change; do not commit a red build.
4. **Commit.** Stage the relevant files explicitly (no `git add -A` of
   unknown files). Write a Conventional Commit: `type(scope): summary` in the
   imperative, at most 72 characters, plus a short body explaining why. Use
   `$ARGUMENTS` as the intent when provided.
5. **Push.** `git push -u origin HEAD`.
6. **Report.** Give the commit SHA and branch, say that the Build workflow will
   deploy it to `dev` (if `dev` is enabled), and how to follow it:
   `gh run list --workflow build.yml --branch <branch> --limit 1` then
   `gh run watch <id>`. Suggest opening a PR (`gh pr create --fill`) to deploy
   to `staging` and, once merged, to `prod`.
