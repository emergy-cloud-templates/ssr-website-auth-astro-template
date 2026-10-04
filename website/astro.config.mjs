// @ts-check
import { fileURLToPath } from "node:url";

import node from "@astrojs/node";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const isBuild = process.argv.includes("build");

// Optional public URL of a remote dev environment (for example a devkit or
// Codespaces HTTPS proxy in front of `astro dev`). Unset for plain local dev,
// and ignored by `astro build` so builds never depend on the dev machine.
const devUrl = isBuild ? undefined : process.env.DEV_URL;
const devHost = devUrl ? new URL(devUrl).hostname : undefined;

/** Prints the public URL next to Astro's own "Local" line when DEV_URL is set. */
function devUrlBanner() {
  return {
    name: "dev-url-banner",
    hooks: {
      "astro:server:start": () => {
        if (devUrl) console.log(`\n  Public  ${devUrl}/\n`);
      },
    },
  };
}

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  output: "server",
  ...(devUrl && { site: devUrl }),

  // The Lambda entry (ssr/lambda.js) drives Astro through the Node adapter's
  // request handler, so the adapter runs in "middleware" mode.
  adapter: node({ mode: "middleware" }),

  server: {
    host: true,
    port: 4321,
    ...(devHost && { allowedHosts: [devHost] }),
  },

  security: {
    // A TLS-terminating proxy in front of `astro dev` makes the browser Origin
    // (https://...) differ from the URL the dev server sees (http://...).
    // Trusting the proxy's X-Forwarded-* headers for that one host keeps the
    // CSRF origin check working. In AWS the Lambda shim restores the viewer
    // host itself (see ssr/shim.js), so nothing is needed here.
    ...(devHost && { allowedDomains: [{ hostname: devHost, protocol: "https" }] }),
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      ...(devUrl && { hmr: { protocol: "wss", clientPort: 443 } }),
    },
    ssr: {
      // Bundle every dependency into dist/server so the Lambda zip is
      // self-contained: no node_modules, no layer, no version drift between
      // what was tested and what runs.
      noExternal: isBuild ? true : undefined,
    },
  },

  integrations: [preact(), devUrlBanner()],
});
