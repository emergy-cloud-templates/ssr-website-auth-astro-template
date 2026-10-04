locals {
  all_envs     = ["dev", "staging", "prod"]
  enabled_envs = toset([for e in split(",", var.envs) : trimspace(e) if trimspace(e) != ""])

  # Per-environment overrides, falling back to the shared values.
  base_domain_by_env = {
    dev     = var.base_domain_dev != "" ? var.base_domain_dev : var.base_domain
    staging = var.base_domain_staging != "" ? var.base_domain_staging : var.base_domain
    prod    = var.base_domain_prod != "" ? var.base_domain_prod : var.base_domain
  }
  acm_arn_by_env = {
    dev     = var.aws_website_acm_arn_dev != "" ? var.aws_website_acm_arn_dev : var.aws_website_acm_arn
    staging = var.aws_website_acm_arn_staging != "" ? var.aws_website_acm_arn_staging : var.aws_website_acm_arn
    prod    = var.aws_website_acm_arn_prod != "" ? var.aws_website_acm_arn_prod : var.aws_website_acm_arn
  }
  explicit_hostname_by_env = {
    dev     = var.hostname_dev
    staging = var.hostname_staging
    prod    = var.hostname_prod
  }

  # hostname_<env> wins; otherwise derive from the base domain
  # (dev.<base>, staging.<base>, www.<base> for prod).
  hostname_by_env = {
    for env in local.all_envs : env => (
      local.explicit_hostname_by_env[env] != "" ? local.explicit_hostname_by_env[env] :
      local.base_domain_by_env[env] == "" ? "" :
      env == "prod" ? "www.${local.base_domain_by_env[env]}" : "${env}.${local.base_domain_by_env[env]}"
    )
  }

  # What each environment module receives. A custom domain needs both a
  # hostname and a certificate; otherwise the CloudFront URL is used.
  sites = {
    for env in local.all_envs : env => {
      hostname = local.hostname_by_env[env] != "" && local.acm_arn_by_env[env] != "" ? local.hostname_by_env[env] : ""
      acm_arn  = local.hostname_by_env[env] != "" && local.acm_arn_by_env[env] != "" ? local.acm_arn_by_env[env] : ""
      # Serve the apex too (redirecting to www) when prod lives on www.<base>.
      redirect_apex = (
        env == "prod" && local.acm_arn_by_env[env] != "" && local.base_domain_by_env[env] != "" &&
        local.hostname_by_env[env] == "www.${local.base_domain_by_env[env]}"
      )
      apex_host = local.base_domain_by_env[env]
    }
  }
}
