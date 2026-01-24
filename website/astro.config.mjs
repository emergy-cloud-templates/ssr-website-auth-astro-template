// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import path from 'path';
import { fileURLToPath } from 'url';

import preact from "@astrojs/preact";

import tailwindcss from "@tailwindcss/vite";

import icon from "astro-icon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: "server",

  adapter: node({
    mode: "middleware",
  }),

  vite: {
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },

    plugins: [tailwindcss()],
  },

  integrations: [preact(), icon()],
});