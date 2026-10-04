# Build artifacts, one prefix per commit: builds/<sha>/{client/,server.zip}.
# The Build workflow uploads here; Deploy promotes a build to an environment.
resource "aws_s3_bucket" "artifacts" {
  bucket        = "${var.project_id}-artifacts"
  force_destroy = true

  tags = {
    Name = "${var.project_id} artifacts"
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Old builds are only needed for rollbacks; drop them after 180 days.
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "expire-old-builds"
    status = "Enabled"
    filter {
      prefix = "builds/"
    }
    expiration {
      days = 180
    }
  }
}
