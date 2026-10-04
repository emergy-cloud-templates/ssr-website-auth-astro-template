# Project rules for AI assistants (and humans)

Astro SSR website with authentication (Supabase in production, a local SQLite
provider in development), deployed to AWS (CloudFront + S3 + API Gateway +
Lambda) with Terraform and GitHub Actions. Docs: `README.md`, `docs/`.

## Layout

- `website/`: the Astro app (pnpm project). Run commands from here.
  - `src/middleware.ts`: resolves the user, applies `src/lib/routes.ts`.
  - `src/lib/auth/`: `AuthService` interface + `supabase.ts` + `local/`.
  - `src/pages/api/**`: POST endpoints returning JSON via `src/lib/http.ts`.
  - `src/components/`: Preact islands; forms use `useFormAction`.
  - `ssr/`: AWS Lambda adapter (`lambda.js`, `shim.js`) and local server.
  - `tests/unit` (Vitest), `tests/e2e` (Playwright).
- `infrastructure/`: Terraform; one `website_ssr` module per environment.
- `.github/workflows/`: `ci.yml`, `build.yml` -> `deploy.yml`,
  `update-infrastructure.yml`, `delete-infrastructure.yml`, `claude.yml`.

## Commands (in `website/`)

- `pnpm dev`: dev server, http://localhost:4321 (local auth mode by default).
- `pnpm verify`: lint, format check, types, unit tests, Lambda smoke test.
  **Must pass before any commit.**
- `pnpm test:e2e`: browser tests (needs `pnpm exec playwright install chromium`).
- `pnpm format`: fix formatting.
- Terraform (in `infrastructure/`): `terraform fmt -recursive`,
  `terraform init -backend=false && terraform validate && terraform test`.

## Conventions

- TypeScript strict, ESLint + Prettier (120 columns). Match the surrounding code.
- Server code reads configuration with `getSecret()` from `astro:env/server`
  (via `src/lib/config.ts`), never `import.meta.env` for runtime values: one
  build is promoted to every environment.
- Auth goes through `locals.auth` (`AuthService`). Never import a provider in
  pages or routes. User-facing failures are `AuthError` codes.
- Validate every input on the server (`src/lib/validation.ts`); redirect
  targets go through `safeRedirectPath`.
- New protected pages: add the prefix to `PROTECTED_ROUTES`.
- New behavior needs tests: unit tests for logic and routes, a Playwright test
  for user flows (with `expectAccessible`).
- Typography: plain hyphen `-`, never em or en dashes.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
  `test:`, `chore:`, `ci:`, `infra:`), imperative, explain why in the body.

## Guardrails

- **Never read, print or commit `.env` files**, `deploy.env`, Terraform state,
  or secret values. Use `.env.example` to learn variable names.
- **Never push to `main`** and never force-push. Work on a branch; production
  changes go through pull requests.
- Pushing a branch **deploys it to the `dev` environment** (Build workflow).
  Opening a PR deploys to `staging`; merging deploys to `prod`. Treat `git
  push` as a deployment.
- Do not run `terraform apply`/`destroy`, `scripts/deploy.sh deploy|ship|infra
  apply|secret`, or the Delete Infrastructure workflow unless the user asks for
  that exact action.
- Do not point tests or scripts at a remote Supabase project; tests use the
  local provider.
- Keep the template generic: no account IDs, private domains or customer data.
