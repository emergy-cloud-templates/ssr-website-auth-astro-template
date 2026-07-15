# Create Lambda function to perform CRUD operations on DynamoDB table    
resource "aws_lambda_function" "website_ssr" {
  function_name = "${var.env_config.project_id}_${var.env_config.environment}_website_ssr"
  handler       = "lambda.handler"
  role          = var.lambda_role_arn
  runtime       = "nodejs22.x"

  filename = var.lambda_zip_path
  layers   = [var.lambda_layer_arn]

  # # VPC configuration
  timeout     = 30
  memory_size = 256

  environment {
    variables = {
      # No secret values here: the Lambda loads the "<env>/<project_id>" JSON
      # secret into process.env at cold start (ssr/lambda.js -> loadSecrets).
      APP_SECRETS_ID = local.app_secrets_id
      ENV            = var.env_config.environment
    }
  }

  tags = {
    Name      = "${var.env_config.project_id} ${var.env_config.environment} website ssr"
    env       = var.env_config.environment
    projectId = var.env_config.project_id
  }
}


resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "${var.env_config.project_id}_${var.env_config.environment}_AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.website_ssr.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.website_ssr.id}/*/*/*"
}
