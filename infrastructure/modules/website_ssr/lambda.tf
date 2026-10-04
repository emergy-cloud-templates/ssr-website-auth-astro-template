resource "aws_cloudwatch_log_group" "website_ssr" {
  name              = "/${var.project_id}/${var.environment}/website-ssr"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "website_ssr" {
  function_name = "${var.project_id}_${var.environment}_website_ssr"
  handler       = "lambda.handler"
  role          = var.lambda_role_arn
  runtime       = "nodejs24.x"
  architectures = ["x86_64"]
  memory_size   = var.lambda_memory_size
  # Just under API Gateway's 29 s integration limit.
  timeout = 28

  # Initial code only. Releases are pushed by the Deploy workflow with
  # `aws lambda update-function-code`, so Terraform must not roll them back.
  filename = var.lambda_zip_path
  layers   = [var.lambda_layer_arn]

  environment {
    variables = {
      # No secret values here: lambda.js loads the "<env>/<project_id>" JSON
      # secret into process.env at cold start (ssr/loadSecrets.ts).
      APP_SECRETS_ID       = "${var.environment}/${var.project_id}"
      ENV                  = var.environment
      ORIGIN_VERIFY_SECRET = random_password.origin_verify.result
      NODE_OPTIONS         = "--enable-source-maps"
    }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.website_ssr.name
  }

  tags = merge(local.tags, { Name = "${var.project_id} ${var.environment} website ssr" })

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  # CloudFront must send the origin secret everywhere before the function
  # starts requiring it (matters when the secret is added or rotated).
  depends_on = [aws_cloudfront_distribution.cdn]
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "${var.project_id}_${var.environment}_AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.website_ssr.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.website_ssr.execution_arn}/*/*/*"
}
