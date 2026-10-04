# Contributing

Thanks for helping improve this template. The goal is a reusable, well-tested
baseline for authenticated Astro SSR websites, not a single project's
application.

## Good contributions

- Auth and session correctness, security hardening.
- Tests for uncovered behavior.
- Deployment and infrastructure improvements that stay easy to understand.
- Accessibility fixes.
- Documentation that helps a new maintainer run the template end to end.

## Local setup

```sh
cd website
pnpm install
pnpm dev                                 # local auth mode, no account needed
pnpm exec playwright install chromium    # once, for e2e tests
```

See [docs/local-development.md](docs/local-development.md).

## Before opening a pull request

```sh
cd website
pnpm format
pnpm verify        # lint, format check, types, unit tests, Lambda smoke test
pnpm test:e2e      # browser tests
```

If you changed `infrastructure/`:

```sh
cd infrastructure
terraform fmt -recursive
terraform init -backend=false && terraform validate && terraform test
```

and run `terraform plan` against your own AWS account when the change affects
real resources. If you changed the UI, regenerate the screenshots
(`node scripts/screenshots.mjs` in `website/` after `pnpm build && pnpm prepare:aws`).

Never commit `.env` files, `deploy.env`, Terraform state or plans, zips,
account IDs, private domains or credentials.

## Pull request guidelines

- One concern per pull request, with a Conventional Commit title
  (`feat:`, `fix:`, `docs:` ...).
- Explain why the change helps template users.
- Add or update tests; include verification notes and screenshots for UI changes.
- Update the docs when setup, configuration or behavior changes.
- Follow [AGENTS.md](AGENTS.md) (it is written for AI assistants, and it is the
  same set of rules for humans).

## Security

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
