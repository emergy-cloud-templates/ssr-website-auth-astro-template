# static-website-astro-template

### Setup

1. Connect to the AWS Account
2. Create a proper role

I created a role manually with the following trust relationship
(Got the ARN by testing with CLI, I got the error and I took the right arn)
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "arn:aws:sts::174099964602:assumed-role/AWSReservedSSO_AWSAdministratorAccess_8bede5583a622ea8/aws@emergy.cc",
                    "arn:aws:sts::101257774203:assumed-role/AWSReservedSSO_AWSAdministratorAccess_0aabb06727cbca28/aws@emergy.cc"
                ]
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

3. Assume the role locally.

You know it work if you don't have any error
```sh
eval $(aws sts assume-role \
  --role-arn arn:aws:iam::101257774203:role/emergy-cloud/cmfkizpwj0001108ctoch0kyo/github-cmfkizpwj0001108ctoch0kyo \
  --role-session-name local-test \
  --profile EmergyInfra \
  | jq -r '.Credentials | "export AWS_ACCESS_KEY_ID=\(.AccessKeyId)\nexport AWS_SECRET_ACCESS_KEY=\(.SecretAccessKey)\nexport AWS_SESSION_TOKEN=\(.SessionToken)\n"')
```
If you really want to be sure, you can run the following
```sh
aws sts get-caller-identity --output text
```

4. Try to setup the infrastructure
```sh
export BUCKET_NAME="101257774203-5aac730-terraform-state-do-not-delete"
export DYNAMODB_NAME="terraform-state-lock"
export AWS_ACCOUNT="101257774203"
terraform init \
  -backend-config="bucket=$BUCKET_NAME"  \
  -backend-config="key=test-project_ssr/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=$DYNAMODB_NAME"

export TF_VAR_aws_account_number=101257774203
export TF_VAR_project_id=test-delete   
export TF_VAR_aws_website_acm_arn="arn:aws:acm:us-east-1:101257774203:certificate/e1881546-e730-4c45-924f-dbffea8429e0"
export TF_VAR_base_domain="bmi-calculator.top"
terraform apply
```
5. Deploy the code
```
cd website
pnpm run build
aws s3 cp ./dist/ s3://cmfkizpwj0001108ctoch0kyo-website --recursive

```
6. Clean the cloudfront
7. Automatise this.
