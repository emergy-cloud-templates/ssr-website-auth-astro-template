
resource "aws_s3_bucket" "artifacts" {
  bucket        = "${var.project_id}-artifacts"
  force_destroy = true
  tags = {
    Name      = "${var.project_id} artifacts"
    projectId = var.project_id
  }
}