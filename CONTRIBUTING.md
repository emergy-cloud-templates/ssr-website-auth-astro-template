# Contributing

Thanks for helping improve this template. The goal is to keep the repository
useful as a reusable baseline for authenticated Astro SSR websites, not to turn
it into a single project's private application.

## Good Contributions

- Auth and session correctness improvements.
- Tests for middleware, redirects, and API route behavior.
- Better deployment documentation.
- Smaller or safer Lambda packaging.
- Terraform hardening.
- Accessibility fixes.
- Provider variants that remain easy to understand.
- Documentation that helps a new maintainer run the template end to end.

## Local Setup

```sh
cd website
pnpm install
cp .env.example .env
pnpm dev
```

Set the Supabase values in `.env` before testing auth flows.

## Validation

Before opening a pull request, run:

```sh
pnpm --dir website build
pnpm --dir website test:ssr
```

If your change touches infrastructure, also run Terraform formatting:

```sh
terraform -chdir=infrastructure fmt -recursive
```

Run `terraform plan` against your own AWS account or test environment before
submitting infrastructure changes. Do not commit generated state, plans, zip
files, local environment files, account IDs, domains, or credentials.

## Pull Request Guidelines

- Keep changes scoped to one concern.
- Explain why the change is useful for template users.
- Include screenshots for visible UI changes.
- Include test or verification notes.
- Update documentation when setup, deployment, or environment variables change.
- Avoid project-specific naming unless the file is explicitly an example.

## Security

Please do not open public issues for vulnerabilities. Follow
[SECURITY.md](./SECURITY.md).
