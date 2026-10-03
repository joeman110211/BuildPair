# BuildPair responsive design audit — 3 October 2026

The homepage is the design reference: cream canvas, charcoal headings, orange actions and eyebrows, shared rounded cards, readable copy and mobile-first layouts.

## Changes

- Applied shared button sizing, rounded corners and wrapping labels throughout public, homeowner, tradesperson and admin screens. Preserved button refs and existing navigation/actions.
- Removed rigid minimum widths from flexible cards and form columns so narrow screens can wrap without horizontal overflow.
- Aligned public information, advice, support and download page heroes with the homepage palette and typography.
- Adjusted navigation, menu, AI helper, scrolling sign-in forms and landscape sizing. Compact navigation remains in use below 1,280 pixels.
- Added safe-area CSS, wrapping text, visible keyboard focus, reduced-motion support and responsive heading sizes.
- Simplified unprofessional or internal implementation wording without changing pricing, payment descriptions or pre-launch gates.
- Matched server-exported and initial browser dimension values to avoid React hydration mismatches before adapting to the real viewport.

## Verification coverage

Reviewed 118 route source files and shared components. Runtime checks cover the 24 static public routes listed below, each at 12 Chromium viewport sizes. API data in these checks is browser-local fixture data, including deliberately long business names; no production records were created or changed.

| Viewport width × height | Purpose |
| --- | --- |
| 320 × 568 | Small older phone |
| 360 × 640 | Narrow Android phone |
| 375 × 667 | Compact phone |
| 390 × 844 | Modern phone |
| 414 × 896 | Larger phone |
| 430 × 932 | Large modern phone |
| 568 × 320 | Short phone landscape |
| 768 × 1024 | Portrait tablet |
| 1024 × 768 | Landscape tablet |
| 1100 × 800 | Intermediate desktop width |
| 1280 × 800 | Small desktop |
| 1440 × 900 | Wide desktop |

Routes: `/`, `/about`, `/advice`, `/building-regulations`, `/contact`, `/cookies`, `/delete-account`, `/directory`, `/disclaimer`, `/download`, `/for-homeowners`, `/for-tradespeople`, `/how-it-works`, `/jobs`, `/marketplace-standards`, `/payments`, `/pricing`, `/privacy`, `/report`, `/rewards`, `/terms`, `/trust-safety`, `/updates`, `/waitlist`.

The regression script checks content before and after scrolling, horizontal overflow, clipped button labels, runtime errors, audience tabs/card navigation, compact menus and the AI helper panel. Screenshots were inspected at phone and desktop sizes.

Run the regression script after `npm run build:web` with Playwright available:

```sh
BUILDPAIR_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-responsive-public.mjs
```

Final runtime result: **288 route/viewport checks passed, with zero detected layout failures or page runtime errors.**

Standard checks: TypeScript, production web export, ESLint and the existing 121 tests. ESLint has 16 existing warnings and no errors.

## Limits

Viewport testing is not certification of every physical handset or browser. Safari/WebKit, older browser versions, OS text enlargement, real keyboards and notches still need device testing. Authenticated homeowner, tradesperson and admin screens, token-specific routes and data-dependent states were reviewed in source and receive the shared fixes, but were not all exercised with real accounts. `/founding-trades` and `/status` require Clerk configuration and were excluded from the unconfigured local runtime matrix. Consistency means shared design and usable responsive layouts, not identical pixels on differently sized displays.
