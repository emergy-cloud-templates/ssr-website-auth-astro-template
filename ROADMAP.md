# Roadmap

This roadmap keeps the template focused on practical production readiness for
Astro SSR websites with authentication.

## Near Term

- Add automated tests for auth API routes.
- Add middleware redirect tests for protected and auth-only pages.
- Document required GitHub Actions variables and AWS IAM assumptions.
- Reduce Lambda layer size and document the packaging strategy.
- Add a minimal Supabase setup guide, including redirect URLs.
- Improve account deletion so forks can plug in application data cleanup.

## Infrastructure

- Add clearer Terraform variable descriptions.
- Add example `terraform.tfvars.example` with placeholder values.
- Document custom domain and ACM certificate setup.
- Document CloudFront cache behavior for authenticated SSR requests.
- Add optional deployment notes for non-AWS targets.

## Developer Experience

- Add screenshots or a small demo walkthrough.
- Add a "create a new project from this template" checklist.
- Add issue labels and triage guidance.
- Keep dependency update automation active.
- Improve UI accessibility for auth and dashboard components.

## Non-Goals

- Becoming a full SaaS boilerplate with billing, teams, or product-specific
  domain models.
- Hiding infrastructure details behind a custom CLI.
- Supporting every auth provider in the core template.
- Adding private project configuration to the public repository.
