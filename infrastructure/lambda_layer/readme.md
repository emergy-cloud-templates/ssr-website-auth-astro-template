cd lambda_layer/nodejs
npm init -y
npm install @aws-sdk/client-lambda @aws-sdk/client-s3 axios fs lodash node-gzip

cd ..
zip -r lambda_layer_website_ssr.zip nodejs