# BuildPair production checklist

Status reviewed: 7 September 2026.

The detailed current launch gate is in `docs/PRODUCTION_LAUNCH_2026.md`. This checklist is the shorter operational view. A green build proves that code compiles and tests pass; it does not make third-party services, app stores, payments, hosting, legal obligations or real-device testing disappear.

## Completed in the repository

- [x] Final public product name is BuildPair in user-facing application configuration and copy.
- [x] GitHub repository is `joeman110211/BuildPair`.
- [x] Native identifiers use `uk.co.buildpair.app` and the `buildpair://` URL scheme.
- [x] Public BuildPair landing page, directory, public jobs and public trader profiles exist.
- [x] Public About, How It Works, Homeowner, Tradesperson, Download and Contact pages exist.
- [x] Public Terms, Privacy, Cookie and Marketplace Disclaimer pages exist.
- [x] One Clerk login can enable separate Homeowner and Tradesperson modes.
- [x] Email/password + verification-code auth is implemented.
- [x] Google and Facebook SSO support is implemented in the native auth path; production provider configuration still needs final verification.
- [x] Phone OTP is not required for launch.
- [x] Trader onboarding has four steps, a visible 50-character bio minimum, visible skill selection and Save & Publish routing.
- [x] Current commercial model has Starter Free, Plus and Pro with no automatic free trial.
- [x] Smart related-term trade search and grouped trade categories/services are implemented.
- [x] Postcode geocoding and privacy-safe outward-code public job locations are implemented.
- [x] Homeowner job creation, quote comparison and atomic quote acceptance are implemented.
- [x] Job-scoped messaging and participant checks are implemented.
- [x] Completion and milestone state are implemented.
- [x] Verified-review enforcement exists at API/database level and is restricted to qualifying paid BuildPair work.
- [x] Trade invoices and Resend delivery code are implemented.
- [x] Cloudinary signed-upload code is implemented.
- [x] Admin moderation, reporting, suspension and restoration flows are implemented.
- [x] Account deletion API/UI exists.
- [x] Health and readiness endpoints exist.
- [x] GitHub Quality CI covers lint, TypeScript, unit tests, web export, Android export, iOS export and production dependency audit.
- [x] GitHub Actions Android release build support exists.
- [x] Docker/Caddy production infrastructure and production deployment script exist.
- [x] Live Stripe Plus and Pro monthly products/prices have been created.

## Current launch blockers / work in progress

- [ ] Bring the browser E2E suite into line with the current Clerk web components and current subscription entitlements without weakening production security rules.
- [ ] Re-run the complete browser journey against the exact target deployment and retain passing evidence.
- [ ] Re-test the reported real-device scrolling/reachability problem on trader onboarding and post-a-job screens. The latest automated small-Android reachability checks passed, so this needs device/browser reproduction rather than a blind layout rewrite.
- [ ] Move public production from Chromebook staging infrastructure to an always-on production Linux host.
- [ ] Point `buildpair.co.uk` / `www.buildpair.co.uk` at the public production environment and verify TLS/redirects.
- [ ] Configure production Clerk origin/redirect/provider settings for web and native callbacks.
- [ ] Confirm the production database has every migration applied and take a recovery point/backup before public traffic.
- [ ] Confirm database restore/PITR capability and document the restore procedure.
- [ ] Configure a protected scheduler for credential-expiry maintenance using a strong `CRON_SECRET`.
- [ ] Add production error reporting, centralised logs, uptime monitoring and payment/email/database alerts with personal-data scrubbing.
- [ ] Add hosting-level WAF/rate-limit rules around abuse-sensitive public, AI and authenticated-write endpoints.
- [ ] Ensure production runs with `BUILDPAIR_PREVIEW_DATA_ENABLED=false` and does not present demo accounts/jobs as real customers.
- [ ] Remove quiet-launch `noindex, nofollow` only when BuildPair is deliberately ready for search-engine discovery.

## Payments

The live monthly Stripe catalogue currently contains:

- BuildPair Plus £19.99/month: `price_1UCqAM8bTbZf5Cph1OFqiYPT`
- BuildPair Pro £29.99/month: `price_1UCqC88bTbZf5CphvqAmDTnC`

Before enabling public paid traffic:

- [ ] Configure the production Stripe publishable/secret keys only in the correct production environments.
- [ ] Map the live Plus/Pro price IDs to `STRIPE_BASIC_PRICE_ID` / `STRIPE_FEATURED_PRICE_ID`.
- [ ] Configure and verify platform and Connect webhook destinations/signing secrets on `https://www.buildpair.co.uk/api/stripe/webhook`.
- [ ] Configure and verify Billing Portal behaviour.
- [ ] Test subscription start, upgrade, downgrade, cancellation, failed renewal and portal access.
- [ ] Test successful, declined, 3DS, cancelled, duplicate-webhook and refunded job payments before public traffic.
- [ ] Test Connect onboarding including incomplete verification and disabled-payment states.
- [ ] Confirm the 5% marketplace platform-fee policy and decide who absorbs Stripe processing fees.
- [ ] Confirm actual UK VAT-registration status before enabling VAT collection or VAT claims.
- [ ] Configure Stripe/Radar risk controls appropriate to the marketplace model and document chargeback/refund handling.

## Android

- [x] Android package is `uk.co.buildpair.app`.
- [x] BuildPair app icons/splash assets and native build path exist.
- [x] EAS production profile builds an Android App Bundle.
- [x] EAS production profile is pinned to the EAS production environment.
- [ ] Configure production EAS public environment values without exposing server secrets to the bundle.
- [ ] Generate/confirm Android release signing credentials.
- [ ] Produce a signed production AAB and install a QA APK on physical Android hardware.
- [ ] Verify deep links and Clerk/Stripe return URLs from cold and warm app states.
- [ ] Complete Google Play Console account, app record, Play App Signing, store listing, screenshots, privacy/data-safety forms and release track.
- [ ] Test small Android and current Pixel/Samsung-sized hardware, including keyboard/scroll reachability.

## iOS

- [x] iOS bundle identifier is `uk.co.buildpair.app`.
- [x] Shared Expo/React Native codebase and iOS export checks exist.
- [x] EAS production profile is pinned to the EAS production environment.
- [ ] Configure production EAS public environment values without exposing server secrets to the bundle.
- [ ] Configure Apple Developer signing and App Store Connect app record.
- [ ] Produce an iOS production/TestFlight build.
- [ ] Verify deep links and Clerk/Stripe return URLs from cold and warm app states.
- [ ] Complete App Store screenshots, privacy labels, support/privacy URLs and listing metadata.
- [ ] Test a compact iPhone, current iPhone and iPad layout.

## Product / legal / operations

- [x] UK privacy notice, cookie policy, marketplace terms and marketplace disclaimer pages are present.
- [x] The product describes trade credentials carefully rather than silently claiming BuildPair has vetted every credential.
- [x] Account deletion workflow exists.
- [ ] Review final legal wording before a wider paid launch, especially subscriptions, cancellation/refunds, consumer contracts, VAT invoicing, platform liability and payments.
- [ ] Define and document complaints, dangerous-work, disputed-work, chargeback and trader-removal procedures for support/admin use.
- [ ] Finalise the retention/deletion policy before app-store release.
- [ ] Verify production support mailbox ownership and response process.

## Release evidence

Do not call BuildPair production-ready until there is evidence for the exact release being shipped:

- [ ] exact production Git SHA recorded,
- [ ] Quality CI green,
- [ ] production-safe browser smoke/E2E evidence retained,
- [ ] production health/readiness green,
- [ ] database backup and restore readiness confirmed,
- [ ] low-value live Stripe smoke test completed and reconciled appropriately,
- [ ] Android signed build installed/tested,
- [ ] iOS TestFlight/App Store build tested,
- [ ] monitoring and alerts confirmed working.

## Intentional historical internal names

The product and repository are BuildPair. Two legacy strings remain intentionally inside the migration system because renaming already-applied migration identifiers can corrupt migration tracking:

- `db/migrations/0000_buildmate_initial.sql`
- migration ledger table `buildmate_migrations`

These are internal historical identifiers, not user-facing branding.
