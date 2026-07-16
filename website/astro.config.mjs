// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import path from 'path';
import { fileURLToPath } from 'url';

import preact from "@astrojs/preact";

import tailwindcss from "@tailwindcss/vite";

import icon from "astro-icon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const devUrl = process.env.DEV_URL;

function devUrlBanner() {
  return {
    name: "dev-url-banner",
    hooks: {
      "astro:server:start": () => {
        if (process.env.DEV_URL) {
          console.log(`\n  \x1b[32m🌐 Public\x1b[0m  ${process.env.DEV_URL}/\n`);
        }
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  output: "server",

  ...(devUrl && { site: devUrl }),

  server: {
    host: true,
    port: 4321,
    allowedHosts: [".dvk.emergy.cloud"],
  },

  security: {
    // Trust X-Forwarded-Proto/Host from the devkit HTTPS proxy so the
    // request URL origin matches the browser's Origin header; without this
    // Astro's CSRF checkOrigin rejects every form POST with a bare 403.
    allowedDomains: [{ hostname: "**.dvk.emergy.cloud", protocol: "https" }],
  },

  adapter: node({
    mode: "middleware",
  }),

  vite: {
    server: {
      ...(devUrl && { hmr: { protocol: "wss", clientPort: 443 } }),
    },

    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },

    plugins: [tailwindcss()],
  },

  integrations: [preact(), icon(), devUrlBanner()],
});