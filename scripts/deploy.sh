#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Manual deploys from your machine: the same steps the GitHub workflows run.
#
#   scripts/deploy.sh check  [env]          verify tools, AWS account, env secret
#   scripts/deploy.sh build                 build once, upload builds/<sha>/
#   scripts/deploy.sh deploy <env> [sha]    promote a build (default: last build)
#   scripts/deploy.sh ship   <env>          build + deploy
#   scripts/deploy.sh infra  [plan|apply]   terraform for every enabled env
#   scripts/deploy.sh secret <env> <file>   create/update "<env>/<project_id>"
#                                           from a JSON file (values never printed)
#
# Configuration comes from the environment or from ./deploy.env (gitignored,
# see deploy.env.example). AWS credentials come from your usual AWS CLI setup
# (profile, SSO, or exported keys).
# -----------------------------------------------------------------------------
# Adapted from /common/api/astro-aws-deploy-cli (origin: app.upmatch.io).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEBSITE_DIR="$ROOT/website"
INFRA_DIR="$ROOT/infrastructure"
LAST_BUILD_FILE="$ROOT/.last_build"

if [[ -f "$ROOT/deploy.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/deploy.env"
  set +a
fi

: "${AWS_REGION:=us-east-1}"
: "${ENVS:=dev,prod}"
ARTIFACT_BUCKET="${ARTIFACT_BUCKET:-${PROJECT_ID:-}-artifacts}"
export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"

red() { printf '\033[0;31m%s\033[0m\n' "$*" >&2; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
step() { printf '\033[1;34m==> %s\033[0m\n' "$*"; }
die() {
  red "Error: $*"
  exit 1
}

require_config() {
  local missing=()
  for var in "$@"; do [[ -n "${!var:-}" ]] || missing+=("$var"); done
  ((${#missing[@]} == 0)) || die "missing configuration: ${missing[*]} (set them in deploy.env or the environment)"
}

require_tools() {
  for tool in "$@"; do command -v "$tool" >/dev/null || die "'$tool' is not installed"; done
}

valid_env() {
  [[ "$1" =~ ^(dev|staging|prod)$ ]] || die "environment must be dev, staging or prod (got '$1')"
  [[ ",${ENVS}," == *",$1,"* ]] || die "'$1' is not enabled (ENVS=${ENVS})"
}

check_aws_account() {
  require_config AWS_ACCOUNT_ID
  local account
  account=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) ||
    die "AWS authentication failed: log in first (aws sso login / aws configure)"
  [[ "$account" == "$AWS_ACCOUNT_ID" ]] || die "logged in to account $account, expected $AWS_ACCOUNT_ID"
  green "AWS account $account"
}

# Compares secret KEYS with infrastructure/required-secret-keys.txt. Values are
# never printed.
check_secret() {
  local env=$1 secret_id="$1/$PROJECT_ID" keys missing=()
  if ! keys=$(aws secretsmanager get-secret-value --secret-id "$secret_id" \
    --query SecretString --output text 2>/dev/null | jq -r 'keys[]'); then
    die "secret '$secret_id' not found or unreadable: create it with 'scripts/deploy.sh secret $env <file.json>'"
  fi
  while IFS= read -r key; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    grep -qx "$key" <<<"$keys" || missing+=("$key")
  done <"$INFRA_DIR/required-secret-keys.txt"
  ((${#missing[@]} == 0)) || die "secret '$secret_id' is missing keys: ${missing[*]}"
  green "Secret $secret_id has every required key"
}

cmd_check() {
  require_tools aws jq zip pnpm node
  require_config PROJECT_ID AWS_ACCOUNT_ID
  check_aws_account
  if [[ -n "${1:-}" ]]; then
    valid_env "$1"
    check_secret "$1"
  fi
}

cmd_build() {
  require_tools aws zip pnpm git
  require_config PROJECT_ID
  check_aws_account

  local sha
  sha=$(git -C "$ROOT" rev-parse HEAD)
  if [[ -n "$(git -C "$ROOT" status --porcelain)" ]]; then
    sha="${sha}-dirty-$(date +%Y%m%d%H%M%S)"
  fi

  step "Building $sha"
  (
    cd "$WEBSITE_DIR"
    pnpm install --frozen-lockfile
    pnpm build
    echo "$sha" >dist/version.txt
    pnpm prepare:aws
    rm -f server.zip
    (cd ssr_dist && zip -qr ../server.zip .)
  )

  step "Uploading to s3://$ARTIFACT_BUCKET/builds/$sha/"
  aws s3 cp "$WEBSITE_DIR/dist/client" "s3://$ARTIFACT_BUCKET/builds/$sha/client" --recursive --only-show-errors
  aws s3 cp "$WEBSITE_DIR/dist/version.txt" "s3://$ARTIFACT_BUCKET/builds/$sha/client/version.txt" --only-show-errors
  aws s3 cp "$WEBSITE_DIR/server.zip" "s3://$ARTIFACT_BUCKET/builds/$sha/server.zip" --only-show-errors
  echo "$sha" >"$LAST_BUILD_FILE"
  green "Built $sha"
}

cmd_deploy() {
  local env=${1:-}
  [[ -n "$env" ]] || die "usage: scripts/deploy.sh deploy <env> [sha]"
  valid_env "$env"
  require_tools aws jq
  require_config PROJECT_ID
  local sha=${2:-$(cat "$LAST_BUILD_FILE" 2>/dev/null || true)}
  [[ -n "$sha" ]] || die "no build to deploy: run 'scripts/deploy.sh build' first or pass a sha"

  cmd_check "$env"
  local src="s3://$ARTIFACT_BUCKET/builds/$sha"
  local bucket="s3://${PROJECT_ID}-${env}-website"
  local function_name="${PROJECT_ID}_${env}_website_ssr"

  # Add new assets first, prune old ones last: HTML from the previous Lambda
  # keeps finding its /_astro/* files during the rollout.
  step "Syncing static assets to $bucket"
  aws s3 sync "$src/client/" "$bucket/" --exclude "*_robots.txt" --only-show-errors
  aws s3 cp "$src/client/${env}_robots.txt" "$bucket/robots.txt" --only-show-errors || true

  step "Updating Lambda $function_name"
  aws lambda update-function-code --function-name "$function_name" \
    --s3-bucket "$ARTIFACT_BUCKET" --s3-key "builds/$sha/server.zip" --publish --no-cli-pager >/dev/null
  aws lambda wait function-updated-v2 --function-name "$function_name"

  step "Invalidating CloudFront"
  local arn
  arn=$(aws resourcegroupstaggingapi get-resources --region us-east-1 \
    --resource-type-filters cloudfront:distribution \
    --tag-filters "Key=env,Values=$env" "Key=projectId,Values=$PROJECT_ID" \
    --query 'ResourceTagMappingList[0].ResourceARN' --output text)
  [[ -n "$arn" && "$arn" != "None" ]] || die "no CloudFront distribution tagged env=$env projectId=$PROJECT_ID"
  aws cloudfront create-invalidation --distribution-id "${arn##*/}" --paths "/*" --no-cli-pager >/dev/null

  step "Pruning assets of previous builds"
  aws s3 sync "$src/client/" "$bucket/" --delete --exclude "*_robots.txt" --exclude "robots.txt" --only-show-errors

  green "Deployed $sha to $env"
}

cmd_infra() {
  local action=${1:-plan}
  [[ "$action" =~ ^(plan|apply)$ ]] || die "usage: scripts/deploy.sh infra [plan|apply]"
  require_tools aws terraform pnpm
  require_config PROJECT_ID AWS_ACCOUNT_ID TF_BACKEND_BUCKET TF_STATE_KEY_PREFIX
  check_aws_account

  # Terraform packages the initial Lambda code from website/ssr_dist.
  if [[ ! -f "$WEBSITE_DIR/ssr_dist/lambda.js" ]]; then
    step "Building the Lambda bundle (first run)"
    (cd "$WEBSITE_DIR" && pnpm build && pnpm prepare:aws)
  fi

  export TF_VAR_aws_account_number="$AWS_ACCOUNT_ID" TF_VAR_project_id="$PROJECT_ID"
  export TF_VAR_envs="$ENVS" TF_VAR_aws_region="$AWS_REGION"
  # Same mapping as the workflows (repository variable -> TF_VAR_*), so a
  # local apply never drops domains that CI configured.
  export TF_VAR_base_domain="${AWS_WEBSITE_ACM_NAME:-}" TF_VAR_aws_website_acm_arn="${AWS_WEBSITE_ACM_ARN:-}"
  local env upper name
  for env in dev staging prod; do
    upper=$(tr '[:lower:]' '[:upper:]' <<<"$env")
    name="AWS_WEBSITE_ACM_NAME_$upper" && export "TF_VAR_base_domain_$env=${!name:-}"
    name="AWS_WEBSITE_ACM_ARN_$upper" && export "TF_VAR_aws_website_acm_arn_$env=${!name:-}"
    name="HOSTNAME_$upper" && export "TF_VAR_hostname_$env=${!name:-}"
  done

  cd "$INFRA_DIR"
  terraform init -input=false -reconfigure \
    -backend-config="bucket=$TF_BACKEND_BUCKET" \
    -backend-config="key=${TF_STATE_KEY_PREFIX}/terraform.tfstate" \
    -backend-config="region=$AWS_REGION" \
    -backend-config="use_lockfile=true"
  terraform plan -input=false -out=deploy.tfplan
  if [[ "$action" == "apply" ]]; then
    read -r -p "Apply this plan? [y/N] " answer
    [[ "$answer" =~ ^[Yy]$ ]] || die "aborted"
    terraform apply -input=false deploy.tfplan
  fi
  rm -f deploy.tfplan
}

cmd_secret() {
  local env=${1:-} file=${2:-}
  [[ -n "$env" && -f "$file" ]] || die "usage: scripts/deploy.sh secret <env> <file.json>"
  valid_env "$env"
  require_tools aws jq
  require_config PROJECT_ID
  jq -e 'type == "object"' "$file" >/dev/null || die "$file must contain a JSON object"
  check_aws_account

  local secret_id="$env/$PROJECT_ID"
  if aws secretsmanager describe-secret --secret-id "$secret_id" >/dev/null 2>&1; then
    aws secretsmanager put-secret-value --secret-id "$secret_id" --secret-string "file://$file" >/dev/null
    green "Updated $secret_id (keys: $(jq -r 'keys | join(", ")' "$file"))"
    echo "New values reach the Lambda on its next cold start (or the next deploy)."
  else
    aws secretsmanager create-secret --name "$secret_id" --secret-string "file://$file" >/dev/null
    green "Created $secret_id (keys: $(jq -r 'keys | join(", ")' "$file"))"
  fi
}

case "${1:-}" in
  check) cmd_check "${2:-}" ;;
  build) cmd_build ;;
  deploy) cmd_deploy "${2:-}" "${3:-}" ;;
  ship) cmd_build && cmd_deploy "${2:-}" ;;
  infra) cmd_infra "${2:-plan}" ;;
  secret) cmd_secret "${2:-}" "${3:-}" ;;
  *)
    sed -n '3,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
