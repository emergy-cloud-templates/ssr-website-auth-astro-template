# Architecture

This template is built around a simple split:

- Astro renders dynamic pages on the server.
- Supabase owns authentication and session refresh.
- AWS serves static assets cheaply and routes dynamic requests to Lambda.

## Request Flow

```text
Browser
  |
  v
CloudFront
  |-- static asset paths --> private S3 bucket
  |
  `-- dynamic paths ------> API Gateway --> Lambda --> Astro SSR entry
```

## Application Layer

The Astro app lives in `website/`.

- `astro.config.mjs` enables server output through `@astrojs/node` in middleware
  mode.
- `src/middleware.ts` creates a Supabase server client, reads the current user,
  and handles protected-route redirects.
- `src/lib/supabase.ts` centralizes browser and server client creation.
- `src/pages/auth/*` contains auth views.
- `src/pages/api/auth/*` contains form-backed auth endpoints.
- `src/pages/account/*` and `src/pages/api/account/*` contain account
  management flows.
- `src/pages/dashboard/*` is the starter protected application area.

## Authentication

Supabase Auth is used with `@supabase/ssr` so sessions work across server-rendered
pages and browser components. The middleware reads cookies from the incoming
request, lets Supabase refresh the session when needed, and stores the user in
`Astro.locals`.

The default protected routes are:

- `/dashboard`
- `/account`

The default auth-only routes are:

- `/auth/signin`
- `/auth/signup`
- `/auth/reset-password`

## Serverless Adapter

`website/ssr/lambda.js` adapts API Gateway events to the request/response shape
expected by the Astro server entry generated in `dist/server/entry.mjs`.

The packaging flow is:

```sh
pnpm --dir website build
pnpm --dir website prepare:aws
```

`prepare:aws` creates `website/ssr_dist`, which is zipped and deployed to the
SSR Lambda function.

## Infrastructure Layer

Terraform lives in `infrastructure/`.

- `modules/website_ssr` defines the website stack for one environment.
- The root infrastructure composes dev, staging, and production stacks.
- S3 stores static client assets.
- CloudFront serves static assets and forwards dynamic requests.
- API Gateway provides a Lambda proxy integration.
- Lambda runs the Astro SSR bundle.
- Response header policies add baseline security headers.
- Optional custom domains use an ACM certificate in `us-east-1`.

## Caching

Static paths such as `/_astro/*`, `favicon.*`, `robots.txt`, and similar assets
are routed to S3 and can be cached aggressively.

Dynamic SSR requests are routed to Lambda. Auth cookies and query strings are
forwarded so session-aware pages render correctly.

## Open Questions

- Add automated tests for cookie refresh and redirect behavior.
- Decide whether account deletion should call a privileged backend cleanup
  function in forks that store application data.
- Continue reducing Lambda layer size.
- Add documented examples for custom domain setup and Supabase redirect URLs.
