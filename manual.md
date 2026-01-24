# How to deploy manually from local

## Login properly
```sh
# Always be ready

# Login to the AWS Account Manager
aws sso login --profile EmergyCloudAuto 

export AWS_ACCOUNT_ID=140352704186
export PROJECT_ID=cmkqnzs3o0003csf4izn1l4hg # The project ID used for AWS Artifact
export AWS_REGION="us-east-1"

export TF_VAR_aws_account_number=$AWS_ACCOUNT_ID
export TF_VAR_project_id=$PROJECT_ID
export TF_BACKEND_BUCKET=140352704186-e76d2a7-terraform-state-do-not-delete # Get that manually on s3
export TF_STATE_KEY_PREFIX=$PROJECT_ID

# export TF_VAR_base_domain=$AWS_WEBSITE_ACM_NAME
# export TF_VAR_aws_website_acm_arn=$AWS_WEBSITE_ACM_ARN

# Use the role to controle the proper account
eval $(aws sts assume-role \
  --role-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:role/OrganizationAccountAccessRole" \
  --role-session-name local-test \
  --profile EmergyCloudAuto \
  | jq -r '.Credentials | "export AWS_ACCESS_KEY_ID=\(.AccessKeyId)\nexport AWS_SECRET_ACCESS_KEY=\(.SecretAccessKey)\nexport AWS_SESSION_TOKEN=\(.SessionToken)\n"')

# Initialize Terraform for the first time
terraform init \
  -backend-config="bucket=${TF_BACKEND_BUCKET}" \
  -backend-config="key=${TF_STATE_KEY_PREFIX}/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=terraform-state-lock"

terraform apply
```

## Update layer on dev
For any other update, get the layer version and update on the module the version
```sh

# Create layer (only do it once)
cd infrastructure/lambda_layer/nodejs

npm init -y
npm install @aws-sdk/client-lambda @aws-sdk/client-s3 @smithy/node-http-handler axios fs lodash node-gzip nanostores @nanostores/preact @aws-sdk/s3-request-presigner @supabase/supabase-js preact-render-to-string @iconify-json/heroicons @iconify-json/lucide dotenv @supabase/ssr

npm ci --omit=dev --omit=optional --ignore-scripts
npm audit fix

# Remove test directories
find node_modules -type d \( \
  -name "test" \
  -o -name "tests" \
  -o -name "__tests__" \
  -o -name "docs" \
  -o -name ".github" \
\) -prune -exec rm -rf '{}' +

# Remove unnecessary files
find node_modules -type f \( \
  -name "*.map" \
  -o -name "*.ts" \
  -o -name "*.d.ts" \
  -o -name "*.md" \
  -o -name "LICENSE*" \
  -o -name "CHANGELOG*" \
\) -delete

# Display final size
echo "\nFinal size:"
du -hsx node_modules

cd ..
rm lambda_layer_website_ssr.zip
zip -r lambda_layer_website_ssr.zip nodejs

aws s3 cp lambda_layer_website_ssr.zip "s3://$PROJECT_ID-artifacts/"

export BUCKET="$PROJECT_ID-artifacts"
export KEY="lambda_layer_website_ssr.zip"
export LAYER_NAME=""$PROJECT_ID"_website_ssr"

export LAYER_VERSION_ARN=$(
  aws lambda publish-layer-version \
    --layer-name "$LAYER_NAME" \
    --content S3Bucket="$BUCKET",S3Key="$KEY" \
    --compatible-runtimes nodejs18.x \
    --compatible-architectures x86_64 \
    --query 'LayerVersionArn' \
    --output text
)
echo "New layer version ARN: $LAYER_VERSION_ARN"

echo "Updating layer for 1 function"
for FN in "${PROJECT_ID}_dev_website_ssr"; do
  aws lambda update-function-configuration \
    --function-name "$FN" \
    --layers "$LAYER_VERSION_ARN" --no-cli-pager
done

cd ..
```

## Deploy website on dev

```sh

cd website
npm run build

echo $(git log --format="%H" -n 1) > dist/version.txt
npm run prepare:aws
cd ./ssr_dist && zip -r ../server.zip .
export AWS_REGION="us-east-1"
export S3_BUCKET="${PROJECT_ID}-artifacts"
export COMMIT_SHA="manual-$(date +'%Y-%m-%d_%H%M%S')"
aws s3 cp ./../dist/client s3://$S3_BUCKET/builds/$COMMIT_SHA/client --recursive
aws s3 cp ./../dist/version.txt s3://$S3_BUCKET/builds/$COMMIT_SHA/
aws s3 cp ./../server.zip s3://$S3_BUCKET/builds/$COMMIT_SHA/

# Function to deploy to a specific environment
deploy_to_env() {
    local ENV=$1
    
    if [ -z "$ENV" ]; then
        echo "Error: Environment parameter required (dev, staging, or prod)"
        return 1
    fi
    
    # Validate environment
    if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
        echo "Error: Invalid environment. Must be dev, staging, or prod"
        return 1
    fi
    
    echo "===== Deploying to $ENV environment ====="
    
    SRC="s3://$S3_BUCKET/builds/$COMMIT_SHA"
    TARGET="s3://${PROJECT_ID}-${ENV}-website"
    
    # S3 Sync
    echo "Copying $SRC -> $TARGET"
    if ! aws s3 sync "$SRC/client/" "$TARGET/" --only-show-errors --delete; then
        echo "Error: S3 sync failed"
        return 1
    fi
    
    # Lambda Update
    echo "Updating Lambda function..."
    if ! aws lambda update-function-code \
        --function-name "${PROJECT_ID}_${ENV}_website_ssr" \
        --s3-bucket "$S3_BUCKET" \
        --s3-key "builds/$COMMIT_SHA/server.zip" \
        --publish --no-cli-pager; then
        echo "Error: Lambda update failed"
        return 1
    fi
    
    # Find CloudFront Distribution
    echo "Searching for CloudFront distribution with tags env=$ENV and projectId=$PROJECT_ID..."
    
    DISTRIBUTION_ARN=$(aws resourcegroupstaggingapi get-resources \
        --resource-type-filters cloudfront:distribution \
        --tag-filters \
            Key=env,Values=$ENV \
            Key=projectId,Values=$PROJECT_ID \
        --query 'ResourceTagMappingList[0].ResourceARN' \
        --output text)
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to query for CloudFront distribution"
        return 1
    fi
    
    # Check if distribution was found
    if [ -z "$DISTRIBUTION_ARN" ] || [ "$DISTRIBUTION_ARN" = "None" ]; then
        echo "Error: No CloudFront distribution found with matching tags (env=$ENV, projectId=$PROJECT_ID)"
        return 1
    fi
    
    # Extract distribution ID from ARN
    DISTRIBUTION_ID=$(echo "$DISTRIBUTION_ARN" | awk -F'/' '{print $NF}')
    
    if [ -z "$DISTRIBUTION_ID" ]; then
        echo "Error: Failed to extract distribution ID from ARN"
        return 1
    fi
    
    echo "Found distribution: $DISTRIBUTION_ID"
    
    # Create invalidation
    echo "Creating CloudFront invalidation..."
    if ! aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --no-cli-pager \
        --paths "/*"; then
        echo "Error: CloudFront invalidation failed"
        return 1
    fi
    
    echo "===== Deployment to $ENV complete ====="
}

# Enable strict error handling for the script
set -e
set -o pipefail

# Usage examples:
deploy_to_env "dev"
# deploy_to_env "staging"
# deploy_to_env "prod"