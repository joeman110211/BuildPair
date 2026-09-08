# BuildPair production launch plan

Current canonical production origin: `https://www.buildpair.co.uk`

BuildPair is already using the public production web shape for quiet-launch/pre-release testing. This document is therefore a gate for promoting each exact release and for moving from quiet launch into wider paid/app-store distribution. It does not replace automated tests. A green build proves that code compiles and tests pass; it does not prove third-party services, payments, app stores, production data, DNS or physical devices behave correctly.

## Current product decisions

- Canonical product: BuildPair.
- Canonical public web/API origin: `https://www.buildpair.co.uk`.
- Root `https://buildpair.co.uk` redirects to `www`.
- Dedicated administrator origin: `https://admin.buildpair.co.uk`; public DNS for this hostname must be working before the dedicated Admin APK can be built and proved end to end.
- Native scheme: `buildpair://`.
- Android package: `uk.co.buildpair.app`.
- iOS bundle identifier: `uk.co.buildpair.app`.
- Starter Free: £0, 2 main trade categories, 0 open-marketplace offers.
- BuildPair Plus: £19.99/month, 4 main trade categories, 15 open-marketplace offers/month.
- BuildPair Pro: £29.99/month, 6 main trade categories, 35 open-marketplace offers/month.
- No automatic free trial in the current commercial model.
- Direct quote requests do not consume open-marketplace offer allowance.
- Marketplace job-payment platform fee is currently configured at 5% unless commercial policy is deliberately changed.
- Production environment configuration should keep `BUILDPAIR_PREVIEW_DATA_ENABLED=false`; bundled preview fixtures are also hard-blocked on canonical production hostnames.
- Quiet launch may remain `noindex, nofollow` until the launch owner deliberately enables search indexing.

## Live Stripe catalogue already created

These IDs are public configuration identifiers, not secret keys.

- Plus product: `prod_VDGhEUrdPFzGAm`
- Plus monthly price: `price_1UCqAM8bTbZf5Cph1OFqiYPT` (£19.99 GBP/month)
- Pro product: `prod_VDGj402saoOUUx`
- Pro monthly price: `price_1UCqC88bTbZf5CphvqAmDTnC` (£29.99 GBP/month)

Production server mapping:

```env
STRIPE_BASIC_PRICE_ID=price_1UCqAM8bTbZf5Cph1OFqiYPT
STRIPE_FEATURED_PRICE_ID=price_1UCqC88bTbZf5CphvqAmDTnC
PLATFORM_FEE_PERCENT=5
```

Never commit or paste `sk_live_...`, Clerk secret keys, database credentials, Cloudinary secrets, Resend secrets, Gemini keys, webhook signing secrets or other server credentials into GitHub or chat.

## Native subscription/store-policy decision

BuildPair has two different payment classes and they must not be confused:

1. Homeowner payments to tradespeople are payments for real-world building services. Stripe/Connect remains the intended payment rail for these transactions.
2. Plus/Pro unlock digital BuildPair features. Native app-store rules apply to the purchase of those subscriptions.

For the first App Store / Google Play release, the native apps are deliberately consumption-only for Plus/Pro subscriptions:

- the mobile apps can recognise and use an existing Plus/Pro entitlement attached to the BuildPair account;
- the mobile apps do not initiate Stripe Checkout for Plus/Pro;
- the mobile apps do not expose a Stripe Billing Portal link for changing a digital plan;
- the web app remains the Stripe subscription purchase/management surface;
- Stripe Connect onboarding for receiving payment for real-world trade work remains available on native.

This avoids shipping an unapproved external digital-subscription purchase flow inside the native stores. A later decision can add Apple In-App Purchase / Google Play Billing, or an eligible regional alternative-billing programme, after the relevant developer accounts and store products are configured.

## Public web release gate

The Docker/Caddy public production shape and canonical domain already exist. For every release promoted to that environment:

- record the exact Git SHA deployed to public production and compare it with the approved `main` SHA;
- keep the public app/API same-origin at `www.buildpair.co.uk`;
- confirm the public host continues to block `/admin` and `/api/admin/*`;
- confirm `buildpair.co.uk` still redirects to `www` and TLS remains valid;
- apply every required checked-in database migration and create a recoverable database backup before risky schema/data changes or wider traffic;
- confirm `/api/health` and `/api/readiness` return healthy production results for the promoted release;
- verify production Clerk origins/redirects and intended sign-in providers after auth/provider changes;
- verify Resend production sender/domain and the contact/invoice paths when email configuration changes;
- verify Cloudinary upload/display/replacement/deletion when media configuration changes;
- configure and verify live Stripe Billing, Billing Portal, platform webhook and Connect webhook before wider paid traffic;
- exercise subscription start, upgrade, downgrade, cancellation, failed renewal and portal access before relying on live paid memberships;
- exercise marketplace payment success, decline, 3DS, cancellation, duplicate webhook and refund behaviour before relying on live job payments;
- exercise Connect onboarding including incomplete verification and disabled-payment states;
- configure external uptime/error/log/payment-webhook monitoring and alerts;
- keep search indexing deliberately controlled until the launch owner explicitly removes the quiet-launch noindex rule;
- keep preview/demo marketplace fixtures isolated from production and never present example activity as genuine customer work;
- run the full non-destructive production smoke/E2E suite against the exact deployed SHA and retain the evidence.

## Dedicated admin release gate

- `admin.buildpair.co.uk` must resolve publicly to the intended Caddy/production endpoint.
- The admin origin must remain `noindex, nofollow` and redirect its root to `/admin`.
- The public `www` origin must continue rejecting admin pages/API paths.
- The Admin Android workflow must obtain `/api/client-config` from the dedicated admin origin before compiling the native project.
- The dedicated Admin APK must target the admin origin and must not silently fall back to staging or the public customer origin.
- Admin sign-in must require the dedicated administrator flow and authorised admin access.
- Build/install proof is required on a physical Android device before treating the Admin APK as release-ready.

The current Admin APK workflow is blocked before Gradle because `admin.buildpair.co.uk` cannot be resolved by the GitHub runner. Fix DNS first, then re-run the workflow; do not mislabel that failure as an Android build failure.

## Android production gate

- EAS production builds must use the EAS `production` environment.
- Production public client values include `EXPO_PUBLIC_API_URL=https://www.buildpair.co.uk`, the production Clerk publishable key and live Stripe publishable key where required.
- Server-only secrets must never be bundled into Android.
- Keep Plus/Pro purchase/plan-change controls out of the first Play-distributed native build unless Google Play Billing or an approved UK billing-choice implementation is deliberately added.
- Produce a signed production AAB for Google Play and an internal/test APK only for device QA.
- Verify `buildpair://` auth/payment returns from both cold and warm app states.
- Test sign-up/sign-in, account mode switching, trader onboarding, post-a-job, messaging, quotes, real-world job payments, uploads and account deletion on physical Android devices.
- Explicitly reproduce the previously reported small-screen onboarding/post-a-job scrolling journey on real hardware even though automated reachability checks now cover those primary actions.
- Test at least one small Android phone and one current Pixel/Samsung-sized phone.
- Complete Google Play developer verification, Play App Signing, store listing, screenshots, privacy/data-safety declarations, support URL and release-track setup.

## iOS production gate

- EAS production builds must use the EAS `production` environment.
- Production public client values point to `https://www.buildpair.co.uk` and production Clerk/Stripe public configuration.
- Server-only secrets must never be bundled into iOS.
- Keep Plus/Pro purchase/plan-change controls out of the first App Store native build unless StoreKit In-App Purchase or an approved regional external-purchase entitlement is deliberately added.
- Configure Apple Developer signing, App Store Connect application record and TestFlight.
- Verify `buildpair://` auth/payment returns from cold and warm app states.
- Test sign-up/sign-in, account mode switching, trader onboarding, post-a-job, messaging, quotes, real-world job payments, uploads and account deletion on iPhone-sized devices.
- Test at least a compact iPhone size and a current full-size iPhone; verify iPad layout because tablet support is enabled.
- Complete App Store screenshots, privacy labels, support/privacy URLs, age/category metadata and review submission configuration.

## Current automated-test rule

The product security/entitlement rules are the source of truth. Tests must be updated when a previous beta assumption becomes obsolete; production security must not be weakened merely to make an old test green.

Current examples:

- Starter traders are not paid/searchable lead recipients, so a test must not expect an inactive free trader to accept a paid direct-lead journey.
- Starter has a 2-category limit, not the older 3-category beta expectation.
- The current web auth UI uses Clerk's web components, while native uses BuildPair's custom Clerk screens. Browser tests must target the actual web flow rather than native-only button copy.
- Current canonical broad trade categories and detailed services must be used in tests and deterministic AI fallbacks.
- Mobile-layout tests should prove primary actions can be scrolled into a usable viewport, but reported physical-device problems still require physical-device reproduction.

## Human/account-owner tasks that code cannot complete by itself

- Maintain the production host/cloud account and billing method.
- Control production DNS at the domain provider, including the unresolved `admin.buildpair.co.uk` record.
- Maintain the live Stripe account, bank/payout and regulatory/business details.
- Maintain the Apple Developer/App Store Connect account and accept Apple agreements.
- Maintain the Google Play/Android developer account and accept Google agreements.
- Confirm BuildPair's actual UK VAT registration status before enabling VAT collection or making VAT claims on customer documents.
- Approve final legal wording and operational policies for subscriptions, refunds, chargebacks, disputes, complaints, dangerous work, trader removal and data retention.

## Wider-launch evidence required

Do not mark an exact BuildPair release ready for wider paid/app-store promotion merely because a commit exists. Retain evidence of:

1. the exact public production Git SHA,
2. green Quality CI for that SHA,
3. passing production-safe browser smoke/E2E evidence,
4. production health/readiness evidence,
5. database backup/restore readiness,
6. a successful real low-value live subscription/payment smoke test followed by appropriate refund/cancellation where applicable before paid launch,
7. Android signed-build installation and device QA,
8. iOS TestFlight/App Store build QA before iOS release,
9. production monitoring and alert delivery,
10. dedicated admin DNS/build/device proof before distributing the Admin APK.
