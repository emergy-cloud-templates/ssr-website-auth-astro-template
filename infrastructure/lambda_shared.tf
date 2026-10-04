# Shared by every environment: the Lambda layer, the execution role and the
# initial code package. Each environment gets its own function (see the module).

# Optional extension point for heavy or native dependencies you prefer to keep
# out of the server bundle: add them to lambda_layer/nodejs/package.json and
# mark them `vite.ssr.external` in astro.config.mjs. The app itself is fully
# bundled and does not need the layer. The Update Infrastructure workflow runs
# `npm install` in lambda_layer/nodejs before `apply`.
data "archive_file" "lambda_layer_website_ssr" {
  type        = "zip"
  source_dir  = "${path.root}/lambda_layer"
  output_path = "${path.root}/.build/lambda_layer_website_ssr.zip"
  excludes    = ["readme.md", "lambda_layer_website_ssr.zip"]
}

resource "aws_lambda_layer_version" "lambda_layer_website_ssr" {
  layer_name          = "${var.project_id}_website_ssr"
  filename            = data.archive_file.lambda_layer_website_ssr.output_path
  source_code_hash    = data.archive_file.lambda_layer_website_ssr.output_base64sha256
  compatible_runtimes = ["nodejs22.x", "nodejs24.x"]
}

# Initial function code: `pnpm build && pnpm prepare:aws` must have produced
# website/ssr_dist before plan/apply. Later code releases go through the
# Deploy workflow (aws lambda update-function-code), not Terraform.
data "archive_file" "lambda_website_ssr_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../website/ssr_dist/"
  output_path = "${path.root}/../website/ssr_dist.zip"
}

resource "aws_iam_role" "lambda_exec_website_ssr" {
  name = "${var.project_id}_lambda_exec_website_ssr"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda_exec_policy_website_ssr" {
  name = "${var.project_id}_lambda_exec_policy_website_ssr"
  role = aws_iam_role.lambda_exec_website_ssr.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:${var.aws_account_number}:*"
      },
      {
        Effect   = "Allow"
        Action   = "cloudwatch:PutMetricData"
        Resource = "*"
      },
      {
        # Read the per-env "<env>/<project_id>" secret at cold start. The
        # trailing "-*" matches the random suffix Secrets Manager appends.
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          for env in local.all_envs :
          "arn:aws:secretsmanager:${data.aws_region.current.region}:${var.aws_account_number}:secret:${env}/${var.project_id}-*"
        ]
      }
    ]
  })
}
