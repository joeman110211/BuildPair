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
  {
    files: [
      'app/customer/jobs/**/*.tsx',
      'app/trader/quotes/new.tsx',
      'components/QuoteComparison.tsx',
    ],
    rules: {
      // These React Native Text nodes render ordinary product copy on native and web.
      // Apostrophes are safe text here and escaping them would make the shared copy harder to read.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: [
      'app/(public)/waitlist.tsx',
      'app/admin/visitors.tsx',
      'app/auth/sign-up.tsx',
    ],
    rules: {
      // These existing screens deliberately derive initial/loading UI state from effects.
      // Keep the stricter rule enabled everywhere else while the legacy screens are refactored independently.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
