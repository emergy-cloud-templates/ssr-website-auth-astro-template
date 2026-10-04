---
name: deploy
description: Deploy the current branch (or a given commit) to a chosen environment (dev, staging, prod) through the GitHub Actions workflows. Use when the user asks to deploy, redeploy or roll back an environment, or runs /deploy.
argument-hint: "<dev|staging|prod> [commit-sha]"
disable-model-invocation: true
---

# Deploy to an environment

Arguments: `$ARGUMENTS` = `<env> [sha]`. Requires the GitHub CLI (`gh`) to be
authenticated (`gh auth status`).

1. **Check the target.** The environment must be one of `dev`, `staging`,
   `prod`. For `prod`, confirm with the user before going further (production
   normally changes only by merging a PR into `main`).
2. **With a SHA (redeploy or rollback):** the commit must already have been
   built. Run
   `gh workflow run deploy.yml -f environment=<env> -f sha=<full-sha>`.
3. **Without a SHA (deploy the current branch):** make sure the work is pushed
   (`git status`, `git log origin/<branch>..HEAD`); if not, run the `/ship`
   steps first. Then run
   `gh workflow run build.yml --ref <branch> -f deploy_environments=<env>`.
   This builds the branch head and dispatches Deploy for `<env>`.
4. **Follow it.** `gh run list --workflow <build.yml|deploy.yml> --limit 1`,
   then `gh run watch <run-id>`. Report the result and where to see it: the
   repository's **Deployments** page lists each environment's URL.
5. If the environment is not in the `ENVS` repository variable, the workflow
   skips it: tell the user to add it (and run Update Infrastructure) first.
