# Roadmap

This roadmap keeps the template focused on practical production readiness for
Astro SSR websites with authentication.

## Done

- Auth through one interface, with Supabase and a zero-setup local provider.
- Working email confirmation and password reset flows (PKCE and token hash),
  real account deletion, open-redirect and enumeration protections.
- Self-contained Lambda bundle, CloudFront host forwarding, origin secret.
- Unit, end-to-end (with accessibility checks), Lambda smoke and Terraform tests.
- Optional environments (`ENVS`), per-environment custom domains.
- Getting started, configuration, deployment and customization guides.
- AI assistant setup (`AGENTS.md`, `/ship`, `/deploy`, `@claude`).

## Next

- OAuth providers (Google, GitHub) and magic links behind the same interface.
- Optional multi-factor authentication (TOTP).
- Rate limiting for the local provider and the API routes.
- A narrower IAM policy for the GitHub deploy role.
- Content Security Policy with nonces instead of `'unsafe-inline'`.
- Example of a data feature (Supabase table with row level security) with tests.

## Non-goals

- Becoming a full SaaS boilerplate with billing, teams, or product-specific
  domain models.
- Supporting every auth provider in the core template.
- Adding private project configuration to the public repository.
