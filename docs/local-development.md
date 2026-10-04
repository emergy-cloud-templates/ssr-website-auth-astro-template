# Local development

All commands run from `website/`. Requirements: Node.js 22.13+ (24
recommended, see `.nvmrc`) and pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev          # http://localhost:4321
```

## Choose an auth backend

The app talks to auth through one interface (`src/lib/auth/types.ts`), so you
can switch backends with environment variables only.

| Mode | Setup | Emails | Use it for |
| --- | --- | --- | --- |
| **Local SQLite** (default) | Nothing | http://localhost:4321/dev/mailbox | Day-to-day UI work, offline, tests |
| **Supabase CLI** (local stack) | Docker + `pnpm dlx supabase start` | Mailpit, http://127.0.0.1:54324 | Testing real Supabase behavior locally |
| **Hosted Supabase** | A Supabase project | Real inbox | Integration with a shared dev project |

The rule (`src/lib/config.ts`): `AUTH_PROVIDER` when set; otherwise Supabase
when `PUBLIC_SUPABASE_URL` and a publishable key are set; otherwise local.

### Local SQLite (no account)

Zero configuration. Users, sessions and pending email links are stored in
`website/.data/local-auth.sqlite` (gitignored) using Node's built-in
`node:sqlite`. Passwords are hashed with scrypt; sessions are random tokens in
an httpOnly cookie, stored hashed.

- Emails are not sent: they are printed in the dev server console and listed
  at **/dev/mailbox**, with clickable links.
- New accounts are confirmed immediately. To practice the "check your email"
  flow, set `LOCAL_AUTH_REQUIRE_EMAIL_CONFIRMATION=true`.
- Reset everything: stop the server and delete `website/.data/`.
- Anyone who can reach the dev server can read the mailbox, reset links
  included. That is fine on your machine; behind a shared `DEV_URL` proxy, keep
  only throwaway accounts in local mode.
- The local provider refuses to start on AWS Lambda: it is for development only.

### Supabase CLI (local stack in Docker)

`website/supabase/config.toml` is preconfigured for this app (redirect URLs on
port 4321, the same password policy, email confirmation on).

```sh
pnpm dlx supabase start      # first run downloads the Docker images
```

It prints the API URL and keys. Put them in `website/.env`:

```sh
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key printed by supabase start>
SUPABASE_SECRET_KEY=<secret key printed by supabase start>
```

Restart `pnpm dev`. Emails land in Mailpit at http://127.0.0.1:54324, Supabase
Studio is at http://127.0.0.1:54323. Stop with `pnpm dlx supabase stop`.

### Hosted Supabase

Copy `.env.example` to `.env` and set `PUBLIC_SUPABASE_URL` and
`PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your project (see
[Getting started](getting-started.md#2-connect-supabase)). Add
`http://localhost:4321/**` to the project's Redirect URLs, or emailed links
will be rejected.

Prefer a dedicated development project: tests and experiments then never touch
production users.

## Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with hot reload |
| `pnpm lint` / `pnpm format` | ESLint / Prettier (`format:check` in CI) |
| `pnpm check` | TypeScript + Astro diagnostics |
| `pnpm test` | Unit tests (Vitest), about 10 seconds |
| `pnpm test:e2e` | Browser tests (Playwright) against the Lambda bundle |
| `pnpm test:ssr` | Build the Lambda bundle and smoke-test it outside the project |
| `pnpm verify` | lint + format + types + unit + Lambda smoke: run before pushing |
| `pnpm preview` | Build the Lambda bundle and serve it on http://127.0.0.1:4322 like AWS does |

First time running browser tests: `pnpm exec playwright install chromium`
(on Linux CI, add `--with-deps`).

## Test the production bundle locally

`pnpm preview` builds `ssr_dist/` (exactly what is deployed to Lambda) and
serves it through `ssr/local-server.mjs`, which behaves like CloudFront +
API Gateway: static files from `dist/client`, everything else turned into an
API Gateway event for the Lambda handler. Use it to check a change that
touches the adapter, cookies, headers or the build.

## Remote dev environments

When the dev server runs behind an HTTPS proxy (devkit, Codespaces, Gitpod),
set `DEV_URL` to the public URL (e.g. `https://my-app.example.dev`). The Astro
config then allows that host, trusts the proxy's forwarded headers for the
CSRF origin check and configures hot reload over `wss`. Without it, form
posts through the proxy are rejected with "Cross-site POST form submissions
are forbidden".

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Emailed link says "invalid or has expired" | Links are single use and expire. With Supabase's default (PKCE) flow, open the link in the same browser that requested it, or switch the email templates to the token-hash flow (see [Customization](customization.md#emails-that-work-across-devices)). |
| Supabase: "redirect URL not allowed" / link goes to the Site URL | Add `http://localhost:4321/**` to Authentication > URL Configuration > Redirect URLs. |
| "Cross-site POST form submissions are forbidden" | You are behind a proxy: set `DEV_URL` (above). |
| Signed in, but the dashboard redirects to sign-in | Cookies are `Secure` on HTTPS; open the site with the same scheme and host it was signed in on. |
| `node:sqlite` not found | Use Node.js 22.13 or later. |
