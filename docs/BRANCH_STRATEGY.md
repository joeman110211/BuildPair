# BuildPair five-path release model

BuildPair uses one cross-platform codebase and five long-lived Git branches. The branches are release channels, not separate copies of the application.

## The five branches

1. `testing`
   - All new development, fixes and production-readiness work lands here first.
   - Nothing is promoted out of `testing` until automated checks pass and the relevant feature has been exercised in the test environment.

2. `release/web`
   - Exact tested source approved for the web application.
   - Used for web-specific release verification and production web deployment preparation.
   - Do not develop directly on this branch.

3. `release/android`
   - Exact tested source approved for Android.
   - Used for signed AAB/APK release verification and Play Console preparation.
   - Do not develop directly on this branch.

4. `release/ios`
   - Exact tested source approved for iOS.
   - Used for signed iOS/TestFlight/App Store verification.
   - Do not develop directly on this branch.

5. `main`
   - BuildPair UK production source of truth.
   - Only receives a commit after the same tested revision has passed web, Android and iOS release gates.
   - Production deployments must record and expose the exact `main` Git SHA.

## Promotion flow

`feature/fix work -> testing -> release/web + release/android + release/ios -> main`

The three platform release branches should normally point at the same tested commit. Platform differences belong in the cross-platform source using `.web`, `.native`, Android/iOS configuration or other platform-aware code, not in permanently divergent branch histories.

## Rules

- Never commit production secrets to any branch.
- Never make routine feature changes directly on `main` or a `release/*` branch.
- A red Quality check blocks promotion.
- A test may be corrected when it reflects an obsolete product assumption, but production security or entitlement rules must not be weakened merely to make a test pass.
- Production is not promoted merely because code compiles. Web browser journeys, physical Android QA, iOS/TestFlight QA, payments, authentication, database readiness and launch operations must also satisfy the production launch gate.
- Emergency production fixes are made as a short-lived hotfix branch from `main`, verified, merged to `main`, then immediately brought back into `testing` so the five paths do not drift.

## Legacy branches

Older feature, fix, polish and temporary branches are historical work only. Once their commits are confirmed merged or superseded, they should be deleted from GitHub so the repository presents only the five long-lived paths plus genuinely active short-lived feature/hotfix branches.
