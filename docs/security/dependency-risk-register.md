# BuildPair dependency-security risk register

Last reviewed: **11 October 2026**. Baseline: current `main`, `package-lock.json`, and GitHub Actions **Quality** job (`npm audit --omit=dev --audit-level=high --json`).

## Verified status

- **0 high, 0 moderate, 0 critical** on the reviewed production-scope npm audit for patched dependency PR #174. Earlier 18 high warnings cascaded from the two root packages below.
- **Local patches installed:** the two affected roots have been replaced by reviewed, pinned local package forks. Npm audit reports zero because the forked names differ from the affected upstream names; code-level remediation is checked separately by tests.
- The production website, Android/iOS native app and Stripe subscriptions share a package manifest. Changes to Expo, React Native, Clerk or Stripe Native require coordinated web/native compatibility tests.
- No automatic merges, no `npm audit fix --force`, and no blanket security suppression. The Dependabot configuration proposes updates as soon as upstream packages are available.

## Findings and constraints

| Root finding | Current route | Available safe fix | Exposure and action |
| --- | --- | --- | --- |
| `braces@3.0.3`, GHSA-vfj7-8cjw-p6xm (high) | Metro's micromatch and other toolchain consumers | **Locally patched fork; no official fixed release** | `packages/braces-security` includes recursion-depth limits in the parser and AST walkers, with security regression tests. |
| `node-forge@1.4.0`, GHSA-86w9-cpqp-85rv (high) | Expo CLI's certificate/signing tooling | **Locally patched fork; no official fixed release** | `packages/node-forge-security` rejects extra nested ASN.1 DigestAlgorithm elements, with rejection and valid-signature tests. |

## Resolved URI decoder advisory

- `decode-uri-component` GHSA-vcc3-ghjq-m6fr (moderate): patched upstream `0.5.0` is installed under npm alias `patched-uri-decoder` and exposed through the project-local CommonJS bridge required by `query-string@7`. PR #173 was merged following 175 passing tests, web export, Android/iOS JavaScript exports, lint, TypeScript, CodeQL and browser smoke. The branch's npm audit confirmed **0 moderate**. The request-target size and encoding guards remain as defence in depth.
- Keep the bridge until Expo Router's upstream dependency provides an equivalent compatible fixed version. Monitor real-device deep links and production URL routing after deployment. An Android/iOS JavaScript export validates bundling but is not a physical-device functional test.

The earlier 18 high affected-package entries were downstream effects of these two roots. An affected Expo, Clerk or Stripe native package name alone was not evidence that payments or authentication were directly exploitable.

## Required release and dependency-upgrade checks

1. Read the *latest* advisories and lockfile; never rely on the count reported in an older conversation.
2. Propose narrow versions compatible with **Expo SDK 57 / React Native 0.86 / Stripe Native 0.64**. If upgrading the major SDK is unavoidable, handle separately, including OTA/native binary compatibility.
3. Regenerate `package-lock.json` using `npm@11.19.0` and `npm ci`. Do not hand-edit resolved integrity hashes.
4. Run `npm audit --omit=dev --json`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build:web`, browser hydration smoke, Expo native configuration and Android/iOS tests when native dependencies change.
5. Verify live website, registration, trade/member entitlements, jobs/quotes, Project+ and authenticated billing after any production merge. Keep **BuildPay** disabled and founder-granted Pro access intact.
6. Keep each root advisory open until the **actual package has been patched or removed from the applicable installed dependency tree**. Risk containment alone does **not** close an audit finding.

## Monitoring

- **Dependabot** proposes npm and GitHub Actions updates; it does **not** automatically merge or deploy.
- **Quality** continues to enforce production npm audit. The pinned reviewed fork tree passes; continue auditing future changes.
- **CodeQL** scans BuildPair source code separately. CodeQL success is not proof of dependency security.
- BuildPair's public production checks remain independent and scheduled.

Current tracking: [GitHub issue #148](https://github.com/joeman110211/BuildPair/issues/148). Authoritative vulnerability references: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).

## Verified local-fork remediation

- PR #174 keeps the original project dependency versions pinned except two locally reviewed forks; full native and web build tests passed in GitHub Actions job `114446905717` and the clean-install dependency audit found zero high/moderate/critical entries.
- The forks preserve the upstream licenses and implement proposed upstream code fixes. `npm run verify:security-patches` checks that installations contain the patched source. Never accept a green audit of renamed packages alone as proof of security; maintain these regression tests and periodically review the upstream advisories.
- Replace the forks with official publisher releases when patched versions are available. Real Android/iOS device testing and verification of Render's production rollout remain necessary after merging.
