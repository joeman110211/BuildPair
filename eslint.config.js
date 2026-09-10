const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      '.expo/**',
      'node_modules/**',
      // Playwright/Clerk E2E dependencies are installed only inside the E2E workflow.
      'e2e/**',
      'playwright.config.mjs',
    ],
  },
  {
    files: ['app/trader/quotes/new.tsx'],
    rules: {
      // Quote expiry is deliberately anchored when the selected validity period
      // changes. useMemo keeps the generated ISO timestamp stable between renders.
      'react-hooks/purity': 'off',
    },
  },
]);
