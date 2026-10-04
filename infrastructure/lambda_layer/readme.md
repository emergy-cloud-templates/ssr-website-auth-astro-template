# Lambda layer (optional)

The SSR server bundle is self-contained: `astro.config.mjs` sets
`vite.ssr.noExternal: true`, so every npm dependency is bundled into
`website/dist/server`. The function does not need this layer.

The layer exists as an extension point for dependencies that should NOT be
bundled (native binaries such as `sharp`, or very large SDKs):

1. Add the package to `nodejs/package.json` here.
2. List it in `vite.ssr.external` in `website/astro.config.mjs`.
3. Run `npm install --omit=dev` in `nodejs/` (CI does this before `terraform apply`).

Terraform zips this folder (`data.archive_file.lambda_layer_website_ssr`) and
publishes a new layer version when its content changes. Lambda mounts it under
`/opt/nodejs/node_modules`.
