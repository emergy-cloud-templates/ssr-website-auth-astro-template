# Security checklist

Walk through this list before a project built from the template goes live,
and when changing auth, caching or infrastructure.

## Secrets and repository

- [ ] No `.env`, `deploy.env`, `*.tfvars`, Terraform state or plans in git
      (all gitignored; check `git log` if the repository was imported).
- [ ] Runtime secrets only in the `<env>/<project_id>` Secrets Manager secrets.
- [ ] `SUPABASE_SECRET_KEY` never prefixed with `PUBLIC_`, never sent to the browser.
- [ ] AWS access from GitHub through OIDC (`AWS_INFRA_ROLE_TO_ASSUME`), no
      long-lived access keys in repository secrets.
- [ ] Any credential that was ever committed or pasted somewhere public is rotated.
- [ ] Dependabot (or equivalent) enabled; CI green on `main`.

## Supabase

- [ ] One Supabase project per environment (at least prod separate from the rest).
- [ ] **Confirm email** enabled for production.
- [ ] Site URL and Redirect URLs list only your real origins (no wildcards on
      foreign domains).
- [ ] Custom SMTP configured (the built-in sender is for testing).
- [ ] Password requirements in Supabase at least as strict as `validation.ts`.
- [ ] **Secure password change** enabled (Authentication > Providers > Email):
      a password change from an old session then requires re-authentication.
- [ ] Every table you add has **row level security** enabled with policies.
- [ ] Rate limits (Authentication > Rate Limits) reviewed; CAPTCHA considered
      for public sign-up.

## Application

- [ ] New protected pages are listed in `PROTECTED_ROUTES`.
- [ ] New API routes check `locals.user` and validate every field on the server.
- [ ] Redirect targets from user input go through `safeRedirectPath`.
- [ ] Error responses go through `errorResponse` (no stack traces, no internals).
- [ ] Pages that read `Astro.locals.user` never set a public `Cache-Control`.
- [ ] Account deletion also removes data outside cascading tables.
- [ ] The local auth provider is not used in any deployed environment (it
      refuses to start on Lambda, keep it that way).

## Infrastructure

- [ ] The GitHub deploy role is limited to this repository (bootstrap does
      this) and, for sensitive accounts, to a narrower policy than
      AdministratorAccess.
- [ ] `main` is protected; production deploys only through reviewed PRs; the
      `prod` GitHub Environment requires a reviewer if your team needs it.
- [ ] Terraform state bucket versioned, private, with locking (`use_lockfile`).
- [ ] Custom domains use an ACM certificate in us-east-1; HSTS preload is only
      enabled on prod; review it before submitting your domain to the preload list.
- [ ] The Content Security Policy in `modules/website_ssr/main.tf` is updated
      before adding third-party scripts, fonts or APIs.
- [ ] CloudWatch log retention fits your data-retention policy (default 30 days).
- [ ] Unused environments removed from `ENVS` (their stacks are destroyed).

## Built in (for reference)

- httpOnly, `SameSite=Lax`, `Secure` (on HTTPS) session cookies; no tokens in
  browser storage.
- CSRF protection (Astro origin check) that works behind CloudFront thanks to
  the forwarded viewer host.
- Lambda rejects requests that did not come through CloudFront (origin secret).
- Generic auth errors (no account enumeration), single-use expiring email links,
  password re-check before sensitive changes, password reset only from a fresh
  emailed link, open-redirect-safe `redirectTo` / `next` handling.
- SSR responses not cached at the edge by default; signed-in responses marked
  `private, no-store`.
- Security headers on every response: CSP, HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP.
- Private S3 buckets (Origin Access Control), TLS 1.2+ everywhere.
