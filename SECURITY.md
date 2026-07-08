# Security Policy

This template includes authentication, session cookies, infrastructure, and
deployment workflows, so security reports are welcome and should be handled
carefully.

## Supported Versions

The `main` branch is the supported version of the template.

## Reporting A Vulnerability

Please do not disclose vulnerabilities in public issues.

Preferred options:

- Use GitHub private vulnerability reporting if it is enabled for this
  repository.
- If private reporting is not enabled, contact the maintainer through the email
  address listed on the maintainer's GitHub profile.

Please include:

- A clear description of the issue.
- Affected files or routes.
- Steps to reproduce.
- Potential impact.
- Any suggested fix, if you have one.

## Security Scope

In scope:

- Supabase SSR session handling.
- Auth redirects and protected routes.
- Account API handlers.
- Cookie behavior.
- CloudFront cache behavior for authenticated requests.
- Security headers.
- GitHub Actions deployment workflows.
- Terraform infrastructure defaults.

Out of scope:

- Attacks against Supabase, AWS, GitHub, or Astro services themselves.
- Vulnerabilities caused by private forks that changed the template defaults.
- Reports that require access to secrets or accounts you do not own.

## Maintainer Expectations

Security fixes should be prioritized over feature work. When a report is valid,
the maintainer should acknowledge it, prepare a minimal fix, document any
required rotation or migration steps, and credit the reporter when appropriate.
