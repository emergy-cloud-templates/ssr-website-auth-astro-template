# Platform services

A project created through [emergy.cloud](https://emergy.cloud) from this template can get a database with Google
sign-in, analytics, an email waitlist and Stripe payments delivered for it. The platform owns those services; the
template only knows how to read what the platform delivers. Nothing here is required: without the platform every
piece falls back to a local or in-memory mode.

## How the keys arrive

The platform writes one JSON document, the **platform config**, to the SSM SecureString parameter
`/emergy/<project_id>/<env>` in the project's AWS account. Terraform gives the Lambda its name
(`PLATFORM_CONFIG_PARAM`) and `ssm:GetParameter` on that path only. At cold start `ssr/loadSecrets.ts` copies its
keys into `process.env`, below the function variables and the project's own secret `<env>/<project_id>`
(a key set in the own secret wins). A missing own secret is fine when the platform config exists, and a missing
platform config is fine when the own secret exists. Running Lambdas keep old values until the next cold start:
redeploy to apply a key change.

`scripts/deploy.sh check <env>` counts a required key (`infrastructure/required-secret-keys.txt`) when either source
has it. Keep that file to keys every environment gets; analytics, waitlist and payments keys are prod only or
optional.

| Key | Used by |
| --- | --- |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `SITE_URL`, `AUTH_GOOGLE` | Sign-in (a GoTrue server on the platform's services host, same API as Supabase Auth) |
| `DATABASE_URL` | The waitlist and billing tables (`src/lib/db.ts`) |
| `PUBLIC_UMAMI_WEBSITE_ID`, `PUBLIC_UMAMI_SCRIPT_URL` | The analytics tag in `Layout.astro` (prod only) |
| `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_DOI_TEMPLATE_ID` | Waitlist double opt-in (prod only) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments (`STRIPE_PRICE_PRO` is the project's own) |

## Analytics

`src/lib/umami.ts` and `Layout.astro` add the Umami tag when both keys are set. They are read with `getSecret` on
each request, never `import.meta.env`, because Astro inlines that at build time and one build is promoted to every
environment.

## Waitlist

`WaitlistForm` (home page) posts to `POST /api/waitlist` (`src/pages/api/waitlist.ts`, logic in
`src/lib/waitlist.ts`): a hidden honeypot field, 5 sign-ups per IP per 10 minutes (in memory, so per Lambda
container: a brake, not a guarantee), then an insert into `public.waitlist` through `DATABASE_URL`
(`id bigserial primary key, email text unique not null, source text, created_at timestamptz default now()`, created
by the platform; in memory without `DATABASE_URL`). With the three Brevo keys (prod only) it also calls Brevo's
double opt-in endpoint; the person lands on `/waitlist/confirmed` after clicking the emailed link. Dev and staging get
no Brevo keys: the row is stored and nothing is sent. The Brevo list is the source of truth for confirmation.

## Payments

The `stripe-billing` lego (`src/lib/stripe-billing/`, wired in `src/lib/billing.ts`) with a Postgres store over
`DATABASE_URL` (tables in `src/lib/stripe-billing/sql/billing.sql`, created by the platform). Routes:
`POST /api/billing/checkout` (`{ plan }`, signed-in users), `POST /api/billing/portal`, and the webhook
`POST /api/stripe/webhook`. This template ships one plan, `pro` (`STRIPE_PRICE_PRO` or the lookup key
`pro_monthly`): adapt `plans` in `src/lib/billing.ts` and add your own plan page.

- Without `STRIPE_SECRET_KEY` a deployed environment answers 503; only local development (no `ENV`, or
  `ENV=local`) uses the in-memory fake Stripe.
- Checkout sessions and subscriptions carry `metadata.project` (`PROJECT_ID`) and, outside prod, `metadata.env`.
  The platform registers one Stripe webhook endpoint per billing entity and forwards each event to this app's
  `/api/stripe/webhook`, re-signed with `STRIPE_WEBHOOK_SECRET`, using those tags to find the project and the
  environment. The lego's signature check works unchanged. Tags are a divergence from the lego (the `metadata`
  option of `createStripeBilling`).

## Moving off the platform

Put your own values for the same keys in the project's own secret (they win over the platform config) and redeploy.
A project can move its database to hosted Supabase this way, with no code change.
