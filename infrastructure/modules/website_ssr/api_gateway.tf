resource "aws_api_gateway_rest_api" "website_ssr" {
  name                     = "${var.project_id}_${var.environment}_website_ssr"
  minimum_compression_size = 1
  # Lets the Lambda return binary bodies (images, fonts) base64-encoded;
  # request bodies arrive base64-encoded too. ssr/shim.js handles both.
  binary_media_types = ["*/*"]

  endpoint_configuration {
    types = ["REGIONAL"]
  }
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
  uri                     = aws_lambda_function.website_ssr.invoke_arn
}

resource "aws_api_gateway_integration" "proxy" {
  rest_api_id             = aws_api_gateway_rest_api.website_ssr.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.website_ssr.invoke_arn
}

resource "aws_api_gateway_deployment" "website_ssr" {
  rest_api_id = aws_api_gateway_rest_api.website_ssr.id

  # Redeploy the stage whenever the API definition changes.
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.website_ssr.binary_media_types,
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.any.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.any.id,
      aws_api_gateway_integration.proxy.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [aws_api_gateway_integration.any, aws_api_gateway_integration.proxy]
}

resource "aws_api_gateway_stage" "website_ssr" {
  deployment_id = aws_api_gateway_deployment.website_ssr.id
  rest_api_id   = aws_api_gateway_rest_api.website_ssr.id
  stage_name    = local.stage_name
}
