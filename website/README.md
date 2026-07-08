# Website App

Astro SSR app for the root template. It provides Supabase-backed authentication,
protected account and dashboard pages, and a Lambda-ready server build.

## Setup

```sh
pnpm install
cp .env.example .env
```

Set:

```sh
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Scripts

```sh
pnpm dev
pnpm build
pnpm preview
pnpm test:ssr
```

`pnpm test:ssr` builds the Astro server output, prepares the AWS SSR bundle, and
runs the local Lambda test harness.

## Important Files

- `src/middleware.ts` protects authenticated routes and redirects auth pages.
- `src/lib/supabase.ts` creates browser and server Supabase clients.
- `src/pages/auth/*` contains auth pages.
- `src/pages/api/auth/*` contains auth API handlers.
- `src/pages/api/account/*` contains account API handlers.
- `src/layouts/DashboardLayout.astro` wires authenticated dashboard pages.
- `ssr/lambda.js` adapts Astro server output to API Gateway and Lambda.

## Deployment Notes

The production build is packaged by:

```sh
pnpm build
pnpm prepare:aws
```

The generated `ssr_dist` directory is zipped and deployed to Lambda. Static
client assets from `dist/client` are deployed to S3 and served through
CloudFront.
