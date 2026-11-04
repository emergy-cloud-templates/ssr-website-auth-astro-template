# Website

The Astro SSR app. Project overview and guides: [../README.md](../README.md)
and [../docs](../docs).

```sh
pnpm install
pnpm dev        # http://localhost:4321, local auth mode (no account needed)
pnpm verify     # lint, format, types, unit tests, Lambda smoke test
pnpm test:e2e   # browser tests against the Lambda bundle
```

| Path                          | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `src/middleware.ts`           | Resolves the user, protects routes (`auth.middleware`)                   |
| `src/lib/auth.ts`             | Wires the auth lego: providers, protected routes, the API route handlers |
| `src/lib/supabase-auth/`      | `AuthService` interface, Supabase and local providers (a lego copy)      |
| `src/lib/route.ts`            | `defineRoute` for new API routes (the api-route lego)                    |
| `src/components/ui/theme.css` | The design: every colour, radius and font of the app                     |
| `src/pages/api/`              | Form endpoints (JSON)                                                    |
| `src/pages/auth/callback.ts`  | Landing page for emailed links                                           |
| `ssr/`                        | AWS Lambda adapter and the local server that mimics AWS                  |
| `scripts/prepare-aws.mjs`     | Assembles the Lambda bundle in `ssr_dist/`                               |
| `supabase/config.toml`        | Local Supabase stack (`pnpm dlx supabase start`)                         |
| `tests/`                      | Vitest unit tests and Playwright e2e tests                               |

Configuration: [docs/configuration.md](../docs/configuration.md).
