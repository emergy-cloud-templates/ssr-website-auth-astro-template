#!/usr/bin/env node
// Regenerates the screenshots in docs/images from the packaged Lambda bundle
// in local auth mode. Run after `pnpm build && pnpm prepare:aws`:
//
//   node scripts/screenshots.mjs
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "..", "docs", "images");
const port = 4330;
const base = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ["ssr/local-server.mjs"], {
  cwd: root,
  env: {
    PATH: process.env.PATH,
    PORT: String(port),
    AUTH_PROVIDER: "local",
    LOCAL_AUTH_DB_PATH: join(tmpdir(), `screenshots-${Date.now()}.sqlite`),
  },
  stdio: "inherit",
});

try {
  for (let i = 0; i < 50; i++) {
    if (
      await fetch(base).then(
        (r) => r.ok,
        () => false,
      )
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const shot = (name) => page.screenshot({ path: join(outDir, `${name}.png`) });

  await page.goto(`${base}/`);
  await shot("home");
  await page.goto(`${base}/auth/signin`);
  await shot("sign-in");

  await page.goto(`${base}/auth/signup`);
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Email address").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Correct1horse");
  await page.getByLabel("Confirm password").fill("Correct1horse");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${base}/dashboard`);
  await shot("dashboard");

  await page.goto(`${base}/account`);
  await shot("account");

  await browser.close();
  console.log(`Screenshots written to ${outDir}`);
} finally {
  server.kill();
}
