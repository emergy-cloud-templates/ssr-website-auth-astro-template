import { tmpdir } from "node:os";
import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4329);
const baseURL = `http://127.0.0.1:${port}`;

/**
 * End-to-end tests run against the PACKAGED Lambda bundle (ssr_dist), served
 * by ssr/local-server.mjs the way CloudFront + API Gateway serve it, in local
 * auth mode with a throwaway SQLite database. No Supabase, no AWS.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD
      ? "node ssr/local-server.mjs"
      : "pnpm build && pnpm prepare:aws && node ssr/local-server.mjs",
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      PORT: String(port),
      AUTH_PROVIDER: "local",
      LOCAL_AUTH_DB_PATH: join(tmpdir(), `e2e-auth-${process.pid}-${Date.now()}.sqlite`),
      ORIGIN_VERIFY_SECRET: "e2e-origin-secret",
    },
  },
});
