import { getViteConfig } from "astro/config";
import type { ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = {
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
    unstubEnvs: true,
  },
};

// getViteConfig applies astro.config.mjs (aliases, astro:env, astro:middleware)
// so unit tests import app modules exactly as the app does. The cast bridges
// Vitest's and Astro's copies of the Vite config type.
export default getViteConfig(config as Parameters<typeof getViteConfig>[0]);
