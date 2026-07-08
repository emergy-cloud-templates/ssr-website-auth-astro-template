# SSR Website Auth Astro Template

Open-source template for building authenticated websites with Astro SSR. It
combines Astro server rendering, Supabase Auth, account and dashboard screens,
and an AWS deployment blueprint so a new project can start with the hard auth
and infrastructure glue already connected.

This repository is the first template in a planned free library of
production-oriented open-source app templates. The goal is to make common stacks
easier to start from while documenting the security and deployment tradeoffs
that usually get skipped in small examples.

## Why This Exists

Astro is excellent for content-heavy websites, but real products often need more
than static pages: session-aware SSR, protected routes, password flows, account
management, secure cookies, static asset caching, and a repeatable deploy path.
This template is meant to close that gap for solo builders, small teams, and
open-source maintainers who want a practical baseline instead of another toy
starter.

## Project Direction

This repo is intended to be a maintained example, not a one-off scaffold. The
longer-term plan is to publish more open-source templates and a free website
where developers can browse them, compare stacks, and start projects from
documented secure defaults.

Future templates should follow the same principles:

- Reusable by default.
- Clear about security assumptions.
- Practical enough to deploy.
- Small enough to understand.
- Free for the community to use.

## What Is Included

- Astro configured for server output with the Node middleware adapter.
- Supabase SSR auth using cookie-aware server and browser clients.
- Sign up, sign in, sign out, password reset, password update, profile update,
  and account deletion flows.
- Protected `/dashboard` and `/account` routes through Astro middleware.
- Preact components for interactive auth, account, and dashboard UI.
- Tailwind CSS styling.
- AWS infrastructure modules for CloudFront, private S3 static assets, API
  Gateway, Lambda SSR, Lambda layers, response security headers, and optional
  custom domains.
- GitHub Actions workflows for build, deployment, infrastructure updates, and
  infrastructure deletion.
- Dev, staging, and production environment structure.

## Repository Layout

```text
.
├── website/                  # Astro SSR app
│   ├── src/                  # Pages, layouts, middleware, components, stores
│   ├── ssr/                  # Lambda adapter wrapper for Astro server output
│   └── public/               # Static public assets
├── infrastructure/           # Terraform for AWS hosting
│   ├── modules/website_ssr/  # CloudFront, S3, API Gateway, Lambda module
│   └── lambda_layer/         # Node dependencies packaged for Lambda
├── .github/workflows/        # CI, deploy, and infrastructure workflows
├── docs/                     # Architecture and security notes
├── manual.md                 # Manual local deployment notes
└── answers.md                # Draft Claude for Open Source application answers
```

## Quick Start

Prerequisites:

- Node.js 20 or newer.
- pnpm 10 or newer.
- A Supabase project with email auth enabled.

Install and run locally:

```sh
cd website
pnpm install
cp .env.example .env
```

Set the local environment variables:

```sh
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Start the dev server:

```sh
pnpm dev
```

Build the app:

```sh
pnpm build
```

Build and exercise the Lambda SSR package locally:

```sh
pnpm test:ssr
```

## Authentication Model

The app uses `@supabase/ssr` for session handling across server-rendered pages,
API routes, and browser components.

- `website/src/lib/supabase.ts` creates browser and server Supabase clients.
- `website/src/middleware.ts` reads the current user, refreshes sessions when
  possible, redirects unauthenticated users away from protected pages, and
  redirects signed-in users away from auth pages.
- `website/src/pages/api/auth/*` implements auth form actions.
- `website/src/pages/api/account/*` implements account updates.

Protected routes currently include:

- `/dashboard`
- `/account`

Auth routes currently include:

- `/auth/signin`
- `/auth/signup`
- `/auth/reset-password`

## AWS Deployment Model

The infrastructure is designed around a split static and SSR deployment:

- S3 stores static client assets privately.
- CloudFront serves static assets from S3 through Origin Access Control.
- CloudFront sends dynamic SSR requests to API Gateway.
- API Gateway invokes the Lambda SSR function.
- Lambda runs the Astro server output through `website/ssr/lambda.js`.
- Terraform creates separate dev, staging, and production website stacks.

Before using the workflows, configure the required GitHub repository variables
and secrets for AWS OIDC, Terraform state, Supabase, and optional custom domains.
The exact names should match the workflow files under `.github/workflows/`.

For a manual deployment flow, see [manual.md](./manual.md).

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Security checklist](./docs/SECURITY_CHECKLIST.md)
- [Roadmap](./ROADMAP.md)
- [Contributing](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [Support](./SUPPORT.md)

## Open-Source Readiness

This repository is intended to be reusable by other developers. Before publishing
or promoting a fork publicly, review these items:

- Keep `.env` files out of git. Only commit `.env.example`.
- Keep Terraform state out of git. New `*.tfstate` files are ignored.
- Rotate any credentials that were ever committed or shared.
- Keep the template generic: avoid committing project-specific domains, account
  IDs, or customer data.
- Review the CI workflows after changing package managers or environment names.

## Contributing

Issues and pull requests are welcome. Useful contributions include:

- More deployment-provider variants.
- Better environment bootstrapping docs.
- Auth/session hardening.
- Tests for auth API routes and middleware redirects.
- Smaller Lambda package output.
- Accessibility and UI improvements.

Please keep changes template-friendly and avoid adding private project details.

## License

MIT. See [LICENSE](./LICENSE).
