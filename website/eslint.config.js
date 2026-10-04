import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import { defineConfig } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["dist/", "ssr_dist/", ".astro/", ".data/", "node_modules/", "test-results/", "playwright-report/"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // Ambient declarations must use import() types to stay global.
    files: ["**/*.d.ts"],
    rules: { "@typescript-eslint/consistent-type-imports": "off" },
  },
  {
    // Plain JS shipped to Lambda / run by Node as-is.
    files: ["ssr/**/*.{js,mjs}", "scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
);
