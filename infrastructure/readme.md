```sh
export BUCKET_NAME="101257774203-5aac730-terraform-state-do-not-delete"
export DYNAMODB_NAME="terraform-state-lock"
export AWS_ACCOUNT="101257774203"
terraform init \
  -backend-config="bucket=$BUCKET_NAME" \
  -backend-config="key=test-project/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=$DYNAMODB_NAME"
```