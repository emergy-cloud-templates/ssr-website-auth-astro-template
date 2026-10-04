# Infrastructure

Terraform for the AWS hosting of the website. One state holds every enabled
environment; each environment is a full, isolated copy of the stack.

```text
infrastructure/
  versions.tf               providers, S3 backend (configured at init time)
  variables.tf              inputs (project, environments, domains, tuning)
  environments.tf           per-environment domain rules
  environments_modules.tf   one module per environment, gated by var.envs
  lambda_shared.tf          shared Lambda role, layer, initial code package
  artifacts.tf              build artifacts bucket (builds/<sha>/)
  outputs.tf                <env>_cdn_url (read by the workflows), DNS targets
  modules/website_ssr/      S3 + CloudFront + API Gateway + Lambda for one env
  bootstrap/                one-time: state bucket + GitHub OIDC deploy role
  tests/                    `terraform test` with mock providers (offline)
  lambda_layer/             optional Lambda layer (see its readme)
```

Full explanation: [docs/architecture.md](../docs/architecture.md) and
[docs/deployment.md](../docs/deployment.md).

## Run it locally

```sh
# 1. The Lambda code package must exist before the first plan
pnpm --dir ../website build && pnpm --dir ../website prepare:aws

# 2. Point Terraform at your state bucket (see bootstrap/)
terraform init \
  -backend-config="bucket=<state-bucket>" \
  -backend-config="key=<project_id>/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="use_lockfile=true"

# 3. Inputs: copy terraform.tfvars.example to terraform.tfvars, then
terraform plan
terraform apply
```

`scripts/deploy.sh infra plan|apply` (repository root) does the same from
`deploy.env`.

## Test it without AWS

```sh
terraform init -backend=false
terraform validate
terraform test        # environment gating and domain rules, mock providers
```
