
resource "aws_lambda_layer_version" "lambda_layer_website_ssr" {
  layer_name          = "${var.project_id}_website_ssr"
  filename            = "lambda_layer/lambda_layer_website_ssr.zip"
  source_code_hash    = filebase64sha256("lambda_layer/lambda_layer_website_ssr.zip")
  compatible_runtimes = ["nodejs22.x"]
}

# Code of the lambda functions
data "archive_file" "lambda_website_ssr_zip" {
  type        = "zip"
  source_dir  = "./../website/ssr_dist/"
  output_path = "./../website/ssr_dist.zip"
}


# IAM role for the Lambda function to access necessary resources  
resource "aws_iam_role" "lambda_exec_website_ssr" {
  name = "${var.project_id}_lambda_exec_website_ssr"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_exec_policy_website_ssr" {
  name = "${var.project_id}_lambda_exec_policy_website_ssr"
  role = aws_iam_role.lambda_exec_website_ssr.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        "Effect" : "Allow",
        "Action" : "cloudwatch:PutMetricData",
        "Resource" : "*"
      }
    ]
  })
}