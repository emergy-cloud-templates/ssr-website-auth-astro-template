# Getting started

A checklist for turning this template into your own project, from a local
prototype to a production deployment. Each stage works on its own: stop after
stage 1 if you only want to build locally.

| Stage | You get | Accounts needed |
| --- | --- | --- |
| [1. Run it locally](#1-run-it-locally) | The full app on your laptop | None |
| [2. Connect Supabase](#2-connect-supabase) | Real users and real emails | Supabase |
| [3. Prepare AWS](#3-prepare-aws) | An account ready to host the site | AWS |
| [4. Connect GitHub](#4-connect-github) | Automatic deployments | GitHub |
| [5. First deployment](#5-first-deployment) | `dev` (and `prod`) online | - |
| [6. Custom domain](#6-custom-domain-optional) | `www.example.com` | DNS provider |

## 1. Run it locally

1. Create your repository from the template (GitHub: **Use this template**),
   then clone it.
2. Install Node.js 22.13+ (24 recommended) and enable pnpm: `corepack enable`.
3. Start the app:

   ```sh
   cd website
   pnpm install
   pnpm dev
   ```

4. Open http://localhost:4321, sign up, explore the dashboard and account pages.
   Emails (confirmation, password reset) appear at http://localhost:4321/dev/mailbox.
5. Make it yours: change the name in `website/src/config/site.ts`
   (see [Customization](customization.md)).

Nothing else is required: without Supabase settings the app uses the local
SQLite auth provider. See [Local development](local-development.md).

## 2. Connect Supabase

1. Create an account at [supabase.com](https://supabase.com) and a **new
   project** (one per environment is the cleanest setup: e.g. `my-app-dev` and
   `my-app-prod`).
2. Copy the connection values from the project's **API keys** / **Data API**
   settings:

   | Supabase value | Variable |
   | --- | --- |
   | Project URL (`https://<ref>.supabase.co`) | `PUBLIC_SUPABASE_URL` |
   | Publishable key (`sb_publishable_...`, or the legacy `anon` key) | `PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
   | Secret key (`sb_secret_...`, or the legacy `service_role` key) | `SUPABASE_SECRET_KEY` (optional, enables "Delete account") |

3. In **Authentication > URL Configuration**:
   - **Site URL**: your production URL (for local work, `http://localhost:4321`).
   - **Redirect URLs**: add every origin the app runs on, with `/**`:
     `http://localhost:4321/**`, `https://<dev-cloudfront-domain>/**`,
     `https://www.example.com/**`. Emailed links to any other URL are refused.
4. In **Authentication > Sign In / Providers > Email**: keep **Confirm email**
   on for production. Optionally require the same password strength as the
   app (8+ characters, lower, upper, digits).
5. For production, configure **custom SMTP** (Authentication > Emails > SMTP):
   Supabase's built-in sender is rate limited to a few emails per hour and is
   meant for testing.
6. Locally, put the values in `website/.env` (copy `website/.env.example`) and
   restart `pnpm dev`. The local mode banner under the forms disappears: you are
   on Supabase now.

> **Never** prefix the secret key with `PUBLIC_` and never commit `.env`.

## 3. Prepare AWS

Skip this stage if the project is managed by the **emergy.cloud** platform: it
creates the account, the state bucket, the deploy role and the repository
variables for you.

Otherwise, once per AWS account:

1. Install the [AWS CLI](https://aws.amazon.com/cli/) and
   [Terraform](https://developer.hashicorp.com/terraform/install) (1.10+), and
   sign in (`aws sso login` or `aws configure`).
2. Pick a **project ID**: lowercase letters, digits and hyphens, unique in your
   account (it prefixes bucket and function names), e.g. `my-app`.
3. Create the Terraform state bucket and the GitHub deploy role:

   ```sh
   cd infrastructure/bootstrap
   terraform init
   terraform apply -var project_id=my-app -var github_repository=my-org/my-repo
   ```

   The output lists the repository variables for the next stage. Keep
   `infrastructure/bootstrap/terraform.tfstate` somewhere safe (it is gitignored).
4. Create one **Secrets Manager** secret per environment, named
   `<env>/<project_id>` (e.g. `dev/my-app`, `prod/my-app`), holding the runtime
   configuration as JSON:

   ```json
   {
     "PUBLIC_SUPABASE_URL": "https://abcd.supabase.co",
     "PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_...",
     "SUPABASE_SECRET_KEY": "sb_secret_..."
   }
   ```

   With the helper (values are read from the file, never printed):

   ```sh
   cp deploy.env.example deploy.env   # fill in account, project, state bucket
   scripts/deploy.sh secret dev ./dev-secret.json
   scripts/deploy.sh secret prod ./prod-secret.json
   rm ./dev-secret.json ./prod-secret.json
   ```

## 4. Connect GitHub

In your repository: **Settings > Secrets and variables > Actions > Variables**,
add (values from the bootstrap output):

| Variable | Example | Purpose |
| --- | --- | --- |
| `PROJECT_ID` | `my-app` | Prefix of every AWS resource |
| `AWS_ACCOUNT_ID` | `123456789012` | Target account |
| `AWS_REGION` | `us-east-1` | Region of the Lambda, API and buckets |
| `AWS_INFRA_ROLE_TO_ASSUME` | `arn:aws:iam::...:role/my-app-github-deploy` | Role assumed through OIDC (no AWS keys in GitHub) |
| `TF_BACKEND_BUCKET` | `my-app-tfstate-123456789012` | Terraform state bucket |
| `TF_STATE_KEY_PREFIX` | `my-app` | State file prefix |
| `ENVS` | `dev,prod` | Enabled environments (`dev,staging,prod` to add staging) |

All variables are listed in [Configuration](configuration.md#github-repository-variables).

## 5. First deployment

1. Create the infrastructure: **Actions > Update Infrastructure > Run
   workflow** (or `scripts/deploy.sh infra apply` from your machine). It
   creates one CloudFront + S3 + API Gateway + Lambda stack per environment in
   `ENVS`, and publishes each environment URL on the repository's
   **Deployments** page.
2. Add those URLs to the Supabase **Redirect URLs** (stage 2, step 3).
3. Push any branch: the **Build** workflow verifies, builds and deploys it to
   `dev`. Open a PR to `main` for `staging`; merge it for `prod`.

The very first push of a repository created from the template is skipped on
purpose (the AWS account does not exist yet at that point). From then on,
every push deploys. See [Deployment](deployment.md).

## 6. Custom domain (optional)

1. Request a public **ACM certificate in us-east-1** for your domain and its
   subdomains (`example.com` and `*.example.com`), validated by DNS.
2. Set the repository variables `AWS_WEBSITE_ACM_NAME` (`example.com`) and
   `AWS_WEBSITE_ACM_ARN` (the certificate ARN), then run **Update
   Infrastructure**. Environments get `dev.example.com`,
   `staging.example.com` and `www.example.com` (the apex redirects to `www`).
   Per-environment overrides exist: [Deployment](deployment.md#custom-domains).
3. Point DNS records (CNAME, or alias records on Route 53) for those names at
   the CloudFront domains shown in the Terraform output `cloudfront_domains`.
4. Update the Supabase Site URL and Redirect URLs, and set `SITE_URL` in the
   environment secret if you want emailed links to always use the main domain.

Before going live, walk through the [Security checklist](SECURITY_CHECKLIST.md).
