# Testing

| Layer | Tool | Command (in `website/`) | Runs in |
| --- | --- | --- | --- |
| Lint + format | ESLint (+ jsx-a11y), Prettier | `pnpm lint`, `pnpm format:check` | Build, CI |
| Types | `astro check` (TypeScript) | `pnpm check` | Build, CI |
| Unit | Vitest | `pnpm test` | Build, CI |
| Lambda bundle | Node smoke test | `pnpm test:ssr` | CI |
| End-to-end + accessibility | Playwright + axe-core | `pnpm test:e2e` | CI |
| Infrastructure | `terraform validate` / `terraform test` | in `infrastructure/` | CI |

`pnpm verify` runs everything except the browser tests: run it before you push.

## Unit tests (`website/tests/unit`)

Fast (about 10 seconds), no network, no browser.

| File | Covers |
| --- | --- |
| `validation.test.ts` | Email, password, name rules; open-redirect protection |
| `config.test.ts` | Provider selection, legacy key names, Lambda guard, `SITE_URL` |
| `routes.test.ts` | Protected, guest-only and recovery route rules |
| `middleware.test.ts` | User resolution, redirects, cache headers, outage handling |
| `api.test.ts` | Every API route and the auth callback: validation, error mapping, no leaks |
| `local-provider.test.ts` | Local provider against an in-memory SQLite: sessions, links, expiry, reset, deletion |
| `supabase-provider.test.ts` | Supabase provider with a mocked client: error mapping, cookie flags, callbacks, admin deletion |
| `shim.test.ts` | Lambda adapter: headers, host restore, bodies, binary responses, origin secret |

## Lambda smoke test (`pnpm test:ssr`)

Builds the app, assembles `ssr_dist/`, copies it to a temporary directory
outside the project (so there is no `node_modules` to fall back on), and
invokes the real handler with API Gateway events: home page, protected
redirect, a form POST through the CSRF check with session cookie, a
cross-site POST (rejected), a request without the CloudFront secret
(rejected), and the 404 page.

## End-to-end tests (`website/tests/e2e`)

Playwright drives Chromium (desktop and mobile viewports) against the packaged
Lambda bundle served by `ssr/local-server.mjs`, in local auth mode with a fresh
SQLite database: no Supabase, no AWS, nothing to clean up.

Scenarios: public pages and guards, sign up / out / in with return-to-page,
error messages, password reset through the dev mailbox (including link reuse),
profile + password change + account deletion, dashboard navigation on both
screen sizes. Key pages are scanned with axe-core for WCAG 2.1 A/AA issues.

```sh
pnpm exec playwright install chromium   # once (CI adds --with-deps)
pnpm test:e2e                           # builds, then runs
E2E_SKIP_BUILD=1 pnpm test:e2e          # reuse the last build
pnpm exec playwright show-report        # after a failure
```

## Terraform tests (`infrastructure/tests`)

`terraform test` plans the root module with mock providers (no credentials,
nothing created) and checks the environment gating (`envs`) and the custom
domain rules.

```sh
cd infrastructure
terraform init -backend=false
terraform validate && terraform test
```

## Writing tests

- New API route: add cases to `api.test.ts` using the `fakeAuth()` helper.
- New provider behavior: test it in both provider suites so they stay
  interchangeable.
- New page or flow: add a Playwright test with `expectAccessible(page)`.
- Prefer roles and labels (`getByRole`, `getByLabel`) in e2e tests: they double
  as accessibility checks.
