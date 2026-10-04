#!/usr/bin/env node
// Assembles the Lambda bundle in ssr_dist/ from the Astro build:
//
//   ssr_dist/
//     lambda.js            handler ("lambda.handler")
//     shim.js              API Gateway <-> Node request/response conversion
//     loadSecrets.cjs      Secrets Manager -> process.env (bundled with the AWS SDK)
//     package.json         { "type": "module" }
//     dist/server/         the Astro server build (all dependencies bundled in)
//
// The CI build zips this folder to server.zip; Terraform zips it on first apply.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "ssr_dist");
const serverBuild = join(root, "dist", "server");

if (!existsSync(join(serverBuild, "entry.mjs"))) {
  console.error("dist/server/entry.mjs not found: run `pnpm build` first.");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "dist"), { recursive: true });

cpSync(serverBuild, join(out, "dist", "server"), { recursive: true });
for (const file of ["lambda.js", "shim.js", "package.json"]) {
  cpSync(join(root, "ssr", file), join(out, file));
}

await build({
  entryPoints: [join(root, "ssr", "loadSecrets.ts")],
  outfile: join(out, "loadSecrets.cjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  logLevel: "warning",
});

console.log(`Lambda bundle ready in ${out}`);
