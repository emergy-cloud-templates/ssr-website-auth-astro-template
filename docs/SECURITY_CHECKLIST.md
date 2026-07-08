# Security Checklist

Use this checklist when maintaining this template or creating a new template in
the same library.

## Repository Hygiene

- Do not commit `.env` files.
- Do not commit Terraform state, Terraform plans, generated zips, or local build
  output.
- Do not commit private domains, customer data, production logs, or AWS account
  IDs.
- Keep a complete `.env.example` with placeholder values.
- Keep dependency update automation enabled.
- Rotate any credential that was ever committed or pasted into an issue.

## Authentication

- Server-rendered pages must read sessions through the server Supabase client.
- Browser components must use the browser Supabase client.
- Protected routes should redirect unauthenticated users.
- Auth pages should redirect already-authenticated users.
- Password reset and email confirmation redirect URLs must be configured in
  Supabase.
- Error messages should avoid user enumeration where practical.
- Account deletion flows should be explicit and reversible only when the fork
  implements a recovery model.

## Cookies And Caching

- Auth cookies must be forwarded to the SSR origin.
- Authenticated SSR responses should not be cached as public static assets.
- Static assets can use long cache headers only when they are content-addressed
  or otherwise safe to cache.
- CloudFront cache policies should be reviewed when adding new authenticated
  routes or headers.

## Infrastructure

- Use least-privilege IAM roles for build, deploy, and infrastructure workflows.
- Use GitHub OIDC instead of long-lived AWS access keys.
- Keep Terraform backend state encrypted and locked.
- Use ACM certificates in `us-east-1` for CloudFront custom domains.
- Review security headers before adding third-party scripts or external assets.
- Keep dev, staging, and production environment variables separate.

## CI/CD

- CI should install from lockfiles.
- Deployment workflows should fail when expected artifacts are missing.
- Destructive infrastructure workflows should require explicit confirmation.
- Workflow logs should not print secrets or state.
- Pull requests should run build validation before merge.

## Template Release Review

- Confirm the project builds from a clean clone.
- Confirm setup docs match the actual package manager and scripts.
- Confirm example values are placeholders.
- Confirm screenshots or demos do not show private data.
- Confirm the license, contributing guide, security policy, and roadmap are
  present.
