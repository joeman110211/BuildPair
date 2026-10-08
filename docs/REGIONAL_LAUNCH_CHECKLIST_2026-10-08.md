# BuildPair controlled London and Surrey launch — 8 October 2026

Status: PREPARATION ONLY. Do not claim homeowner marketplace is public until legal, QA and deployment checks pass.

## Scope
- Public registrations, homeowner job posting, trade matching and quoting, job-scoped messaging, visits, job records, direct-payment recording, profile tools and applicable business subscriptions.
- BuildPay is **not** available: no collection, funding, releasing, transferring, refunding or protecting job money through BuildPair.
- Growth target: Surrey, Greater London and adjacent reachable areas. Existing trade postcode/radius matching remains authoritative; do not hard-block legitimate neighbouring registrations based on rough postcode prefixes.

## Backup and rollback
- Code backup created first: GitHub branch backup-20261008-pre-marketplace-launch from production commit d9d048eda3ddfce2874b70466a69bd4c536ad298.
- Existing GitHub source ZIP workflow is preserved. Older backup branches are deliberately retained pending a verified database recovery point and retention review.
- CRITICAL: Git backup is not a Neon database snapshot. Identify the production Neon project and create/test a fresh recoverable branch or snapshot before changes to customer data or migrations. Record ID and restore test in private operations documentation.
- Rollback must also restore matching server/client configuration; do not reintroduce removed source-export endpoint or old BuildPay paths.

## Mandatory external responsibilities (owner confirmation)
1. Complete or provide existing ICO fee assessment/registration evidence; pay the fee if applicable.
2. Complete BuildPair and authorised operator registration in the NCA CSEA Industry Reporting Portal where the Online Safety Act reporting duty applies. Record who handles safeguarding reports.
3. Confirm the provider identity, contact address, privacy notices, complaints handling and marketplace terms accurately identify the responsible trading entity. Confirm legal/consumer-law review for direct payments and recurring subscriptions.
4. Review and sign off the new Online Safety Act material-change assessment before activating public homeowner content and job-scoped messaging.

## Technical QA before activating public marketplace
- Lint, TypeScript, unit tests, web export and independent dependency audit; do not misrepresent an existing npm audit failure as resolved.
- Run production-like non-admin end-to-end test: homeowner sign-up -> postcode/job -> trade matching -> quote -> compare/accept -> direct payment agreement -> message -> complete. Confirm mobile reachability and accessibility.
- Test independent BuildPay server lock with direct requests to /api/buildpay/select, /api/stripe/payment-intent, /api/stripe/connect and /api/payments/release, plus nested job and quote attempts to choose BuildPay.
- Confirm no checkout, transfer or Stripe Connect onboarding can be initiated for job payments when BUILDPAY_OPEN is false. Verify subscriptions are separate, billing provider configured and paid entitlement logic correct.
- Remove public pre-launch claims, ensure no premature BuildPay marketing claims, verify public pages and SEO indexability. Confirm preview fixtures are excluded.
- Confirm error monitoring, complaint triage capacity, response handling and rollback ownership.
- Founding Pro terms are anchored to 15 October 2026; do not silently shorten or invalidate existing published offers.

## Launch switches
- lib/launch-config.ts: REGISTRATION_OPEN, HOMEOWNER_REGISTRATION_OPEN and MARKETPLACE_OPEN are currently false.
- server.mjs: independent BUILDPAIR_MARKETPLACE_OPEN environment gate defaults to false. The deployment needs matching client build and server flag.
- BuildPay has a separate source-level shutdown. The marketplace must not inherit Stripe Connect / payment-intent access.
- DO NOT change the launch switches independently before every gate above is passed and the exact release is accepted.

## After launch
- Track real visits, sign-up starts/completions, trade profiles completed, posted jobs, quotes received and time to first match.
- Focus on Surrey/south-west London initially; broaden marketing only when jobs receive suitable replies.
- Existing admin AI assistant and visitor intelligence are retained; no new public admin data endpoint or unrestricted admin API token is to be added.
- Review growth weekly and safety/moderation daily while first real jobs come through.
