const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      '.expo/**',
      'node_modules/**',
      'admin-mobile/**',
      // Playwright/Clerk E2E dependencies are installed only inside the E2E workflow.
      'e2e/**',
      'playwright.config.mjs',
    ],
  },
]);
