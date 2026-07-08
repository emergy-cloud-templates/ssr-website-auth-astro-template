
resource "aws_api_gateway_rest_api" "website_ssr" {
  name = "${var.env_config.project_id}_${var.env_config.environment}_website_ssr"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
  minimum_compression_size = 1
}

resource "aws_api_gateway_deployment" "website_ssr" {
  depends_on  = [aws_api_gateway_integration.any, aws_api_gateway_integration.proxy]
  rest_api_id = aws_api_gateway_rest_api.website_ssr.id
}

resource "aws_api_gateway_stage" "website_ssr" {
  deployment_id = aws_api_gateway_deployment.website_ssr.id
  rest_api_id   = aws_api_gateway_rest_api.website_ssr.id
  stage_name    = "prod"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.website_ssr.id
  parent_id   = aws_api_gateway_rest_api.website_ssr.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "any" {
  rest_api_id   = aws_api_gateway_rest_api.website_ssr.id
  resource_id   = aws_api_gateway_rest_api.website_ssr.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.website_ssr.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "any" {
  rest_api_id             = aws_api_gateway_rest_api.website_ssr.id
  resource_id             = aws_api_gateway_rest_api.website_ssr.root_resource_id
  http_method             = aws_api_gateway_method.any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${aws_lambda_function.website_ssr.arn}/invocations"

}

resource "aws_api_gateway_integration" "proxy" {
  rest_api_id             = aws_api_gateway_rest_api.website_ssr.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${aws_lambda_function.website_ssr.arn}/invocations"
}