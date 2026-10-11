# BuildPair dependency-security risk register

Last reviewed: **11 October 2026**. Baseline: current `main`, `package-lock.json`, and GitHub Actions **Quality** job (`npm audit --omit=dev --audit-level=high --json`).

## Verified status

- **18 high, 3 moderate, 0 critical** npm package entries. This is **21 package entries, not 21 independent root causes or confirmed exploits**. The earlier 11 moderate entries were reduced to 3 by compatible updates.
- **Not resolved:** The lockfile still contains upstream vulnerabilities. The Quality dependency-audit step must **continue to fail**, rather than hiding these findings or falsely indicating a complete remediation.
- The production website, Android/iOS native app and Stripe subscriptions share a package manifest. Changes to Expo, React Native, Clerk or Stripe Native require coordinated web/native compatibility tests.
- No automatic merges, no `npm audit fix --force`, and no blanket security suppression. The Dependabot configuration proposes updates as soon as upstream packages are available.

## Findings and constraints

| Root finding | Current route | Available safe fix | Exposure and action |
| --- | --- | --- | --- |
| `braces@3.0.3`, GHSA-vfj7-8cjw-p6xm (high) | `micromatch` / Metro and other toolchain consumers | **None published** as of review | Recursive pattern parsing may overflow with crafted patterns. Metro uses patterns during builds; do not assume arbitrary public customer input reaches this code. Retain request routing bounds; update once upstream patches; check any runtime glob inputs before allowing untrusted patterns. |
| `node-forge@1.4.0`, GHSA-86w9-cpqp-85rv (high) | Expo CLI / code-signing tooling | **None published** as of review | Signature-validation flaw. Confirm use is restricted to trusted developer/build artifacts; do not process user-provided certificates or signatures through this library. Upgrade Expo tooling when a fix exists and native builds pass. |
| `decode-uri-component@0.2.2`, GHSA-vcc3-ghjq-m6fr (moderate) | `expo-router` -> `query-string@7.1.3` | 0.5.0 is published, but an **ESM-only** release is incompatible with the CommonJS consumer as a blind override | URL-decoding denial-of-service advisory. The production Node server rejects request targets longer than 8,192 bytes **and malformed percent escapes** before Expo routing; these are partial containment measures, not a patch for the dependency. Follow Expo Router / query-string upstream; only replace after runtime URL/deep-link tests. |

Most of the other 18 high package entries are **affected dependants** of the vulnerable packages, including `@clerk/expo`, `@stripe/stripe-react-native`, `expo`, `expo-updates`, `react-native`, `metro`, `@expo/metro`, and associated CLI tooling. **An affected-package name does not establish a direct vulnerability in Clerk authentication or Stripe's payment API**. The dependency edges and actual call sites still require evaluation.

## Required release and dependency-upgrade checks

1. Read the *latest* advisories and lockfile; never rely on the count reported in an older conversation.
2. Propose narrow versions compatible with **Expo SDK 57 / React Native 0.86 / Stripe Native 0.64**. If upgrading the major SDK is unavoidable, handle separately, including OTA/native binary compatibility.
3. Regenerate `package-lock.json` using `npm@11.19.0` and `npm ci`. Do not hand-edit resolved integrity hashes.
4. Run `npm audit --omit=dev --json`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build:web`, browser hydration smoke, Expo native configuration and Android/iOS tests when native dependencies change.
5. Verify live website, registration, trade/member entitlements, jobs/quotes, Project+ and authenticated billing after any production merge. Keep **BuildPay** disabled and founder-granted Pro access intact.
6. Keep each root advisory open until the **actual package has been patched or removed from the applicable installed dependency tree**. Risk containment alone does **not** close an audit finding.

## Monitoring

- **Dependabot** proposes npm and GitHub Actions updates; it does **not** automatically merge or deploy.
- **Quality** continues to surface and fail on high npm audit findings.
- **CodeQL** scans BuildPair source code separately. CodeQL success is not proof of dependency security.
- BuildPair's public production checks remain independent and scheduled.

Current tracking: [GitHub issue #148](https://github.com/joeman110211/BuildPair/issues/148). Authoritative vulnerability references: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).
