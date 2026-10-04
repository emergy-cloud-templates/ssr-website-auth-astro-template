# Configuration

Three layers of configuration, each in exactly one place:

| Layer | Where it lives | Who reads it |
| --- | --- | --- |
| [App runtime variables](#app-runtime-variables) | `website/.env` locally, AWS Secrets Manager in the cloud | The Astro server, at request time |
| [GitHub repository variables](#github-repository-variables) | GitHub > Settings > Secrets and variables > Actions | The workflows |
| [Terraform variables](#terraform-variables) | `TF_VAR_*` (set by the workflows) or `terraform.tfvars` | Terraform |

No secret is ever stored in the repository, in GitHub, in the build output
or in Terraform state.

## App runtime variables

Read at request time through `astro:env` (`src/lib/config.ts`), so one build
runs in every environment.

| Variable | Default | Description |
| --- | --- | --- |
| `AUTH_PROVIDER` | auto | `supabase` or `local`. Auto: `supabase` when the two Supabase values below are set, else `local`. |
| `PUBLIC_SUPABASE_URL` | - | Project URL, e.g. `https://abcd.supabase.co` or `http://127.0.0.1:54321`. |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | - | Publishable key (`sb_publishable_...`). `PUBLIC_SUPABASE_ANON_KEY` (legacy anon key) is accepted too. |
| `SUPABASE_SECRET_KEY` | - | **Server only.** Secret key (`sb_secret_...`) or legacy `SUPABASE_SERVICE_ROLE_KEY`. Only used to delete accounts; without it "Delete account" answers "not configured". |
| `SITE_URL` | request origin | Public origin used in emailed links (e.g. `https://www.example.com`). Set it when several hostnames serve the site. |
| `LOCAL_AUTH_DB_PATH` | `.data/local-auth.sqlite` | Local provider database file. |
| `LOCAL_AUTH_REQUIRE_EMAIL_CONFIRMATION` | `false` | Local provider: require the emailed link before the first sign-in. |
| `DEV_URL` | - | Dev server only: public URL of a remote dev proxy (see [Local development](local-development.md#remote-dev-environments)). |

The publishable key is designed to be public, but this app only uses it on the
server: the browser never talks to Supabase directly.

### Locally

`website/.env` (copy `website/.env.example`). Never commit it.

### On AWS: one secret per environment

Each environment's Lambda reads the AWS Secrets Manager secret named
**`<env>/<project_id>`** (e.g. `prod/my-app`) at cold start and copies every
key into `process.env` (`ssr/loadSecrets.ts`):

```json
{
  "PUBLIC_SUPABASE_URL": "https://abcd.supabase.co",
  "PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_...",
  "SUPABASE_SECRET_KEY": "sb_secret_...",
  "SITE_URL": "https://www.example.com"
}
```

- Required keys are listed in `infrastructure/required-secret-keys.txt`;
  `scripts/deploy.sh check <env>` compares them with the secret (names only,
  values are never printed).
- Create or update it with `scripts/deploy.sh secret <env> <file.json>`, the
  AWS console, or `aws secretsmanager put-secret-value`.
- A change reaches running Lambdas at their next cold start; deploying (or
  updating the function configuration) forces it.
- Terraform deliberately does not manage the secret, so values never land in
  Terraform state.

Variables set by Terraform on the function (`APP_SECRETS_ID`, `ENV`,
`ORIGIN_VERIFY_SECRET`) always win over the secret's keys.

### Adding a variable

1. Read it in server code with `getSecret("MY_VAR")` from `astro:env/server`
   (or extend `resolveConfig` in `src/lib/config.ts` if it is app-wide).
2. Document it in `website/.env.example`.
3. Add it to each environment's secret, and to
   `infrastructure/required-secret-keys.txt` if it is mandatory.

Avoid `import.meta.env.MY_VAR` for runtime values: Vite inlines those at build
time, and the same build is promoted to every environment.

## GitHub repository variables

Variables (not secrets) under **Settings > Secrets and variables > Actions >
Variables**. Projects managed by emergy.cloud get them set automatically.

| Variable | Required | Description |
| --- | --- | --- |
| `PROJECT_ID` | yes | Project identifier, prefixes all AWS resources. |
| `AWS_ACCOUNT_ID` | yes | Target AWS account. |
| `AWS_INFRA_ROLE_TO_ASSUME` | yes | IAM role assumed with GitHub OIDC (see `infrastructure/bootstrap`). |
| `TF_BACKEND_BUCKET` | yes | Terraform state bucket. |
| `TF_STATE_KEY_PREFIX` | yes | Prefix of the state object key (usually the project ID). |
| `AWS_REGION` | no | Default `us-east-1`. |
| `ENVS` | no | Enabled environments, default `dev,prod`. Add `staging` for PR previews. |
| `AWS_WEBSITE_ACM_NAME` / `AWS_WEBSITE_ACM_ARN` | no | Base domain and its us-east-1 certificate (custom domains for every environment). |
| `AWS_WEBSITE_ACM_NAME_<ENV>` / `AWS_WEBSITE_ACM_ARN_<ENV>` | no | Same, per environment (`DEV`, `STAGING`, `PROD`). |
| `HOSTNAME_<ENV>` | no | Exact hostname for one environment (e.g. `HOSTNAME_PROD=app.example.com`). |
| `BUILD_ENV` | no | Dotenv-style lines exported before the build. Build-time values only, never secrets. |
| `NODE_VERSION` | no | Default `24`. |
| `TF_VERSION` | no | Terraform version used by the workflows. |
| `ARTIFACT_BUCKET` | no | Default `<PROJECT_ID>-artifacts`. |
| `AWS_BUILD_ROLE_TO_ASSUME` / `AWS_DEPLOY_ROLE_TO_ASSUME` | no | Separate, narrower roles for build and deploy (default: the infra role). |

Repository **secrets**: only `ANTHROPIC_API_KEY`, and only if you enable the
optional `@claude` workflow.

## Terraform variables

Declared in `infrastructure/variables.tf`; the workflows map the repository
variables above onto them.

| Variable | Default | Description |
| --- | --- | --- |
| `aws_account_number` | - | AWS account ID. |
| `project_id` | - | Project identifier (3-40 lowercase letters, digits, hyphens). |
| `envs` | `dev,prod` | Environments to create. Removing one destroys its stack. |
| `aws_region` | `us-east-1` | Region for Lambda, API Gateway and buckets. |
| `base_domain`, `aws_website_acm_arn` | `""` | Shared custom domain and certificate. |
| `base_domain_<env>`, `aws_website_acm_arn_<env>`, `hostname_<env>` | `""` | Per-environment overrides ([rules](deployment.md#custom-domains)). |
| `lambda_memory_size` | `512` | SSR function memory (MB). |
| `log_retention_days` | `30` | CloudWatch log retention. |
| `price_class` | `PriceClass_100` | CloudFront edge locations. |

For local runs, copy `infrastructure/terraform.tfvars.example` to
`terraform.tfvars` (gitignored) or use `scripts/deploy.sh infra` with
`deploy.env`.
