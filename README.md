# BuildPair

BuildPair is a UK-focused homeowner and tradesperson marketplace built from one Expo / React Native codebase for Android, iOS and web.

The product uses Expo Router, Clerk authentication, Neon Postgres with Drizzle, Cloudinary media, Resend email, Google Gemini assistance and Stripe code paths for subscriptions / marketplace payments.

Repository: `joeman110211/BuildPair`

## Production status (17 October 2026)

BuildPair is a **launched UK marketplace**, deployed on Render from `main`, with the public website at https://www.buildpair.co.uk. The present source of truth for feature availability is `lib/launch-config.ts`, not older pre-launch documentation or tests.

- Homeowner and trade registration, public trade discovery and non-BuildPay marketplace workflows are enabled.
- Tradespeople can create profiles, browse suitable jobs, quote and invoice existing customers, manage jobs and use plan-entitled business tools.
- New eligible trade profiles receive three months of introductory Pro without a card or automatic paid subscription (see launch-offer and subscription code for detailed eligibility).
- Core, Plus and Pro memberships and standalone Project+ checkout have independent gates; test configuration and signed Stripe webhook processing before treating a paid journey as verified.
- **BuildPay controlled money movement is not launched:** `BUILDPAY_OPEN = false`. Direct payment arrangements are made outside BuildPair; records of external payments are user-confirmed, not held funds.
- Partner directory applications require manual approval and confirmed monthly Stripe payment before appearing in the public searchable directory.
- Keep public HTML indexable and authenticated/admin/API routes private. Sitemaps: `public/sitemap.xml`, `public/sitemap-pages.xml` and `public/sitemap-advice.xml`.

### Core product

**Homeowners:** search local trades, save businesses and properties, post work, request and compare quotes, manage agreed jobs, messages, changes, direct-payment records and Home Record / aftercare.

**Tradespeople:** storefront/credential setup, job matching and quote requests, outside-customer quotes, invoices, customer book, projects, calendar, saved searches, analytics and eligible Project+ tools.

**Operations:** private moderation, users, business evidence, partners, traffic/activation, AI assistance, system health, provider usage and owner-entered operating costs.

For the current product baseline and open risks, inspect the latest production release, source, current CI and Render service. Historical reports are evidence, not instructions to revert the launched product.

## Local development

Requirements:
- Node 22.12+
- npm
- Git
- Expo account only when native cloud builds are needed
- Android Studio only when local Android emulator / Gradle debugging is needed

```bash
git clone https://github.com/joeman110211/BuildPair.git buildpair
cd buildpair
npm ci
cp .env.example .env.local
npx expo start
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build:web
```

Native installed apps require `EXPO_PUBLIC_API_URL` to point at the HTTPS deployment that hosts the Expo Router server API. Relative `/api` URLs only work when the web client and server share an origin.

## Environment

Copy `.env.example` to a local ignored environment file and configure the services needed by the environment.

### Required for the connected production app
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` for migrations

### Feature-specific
- Gemini: `GEMINI_API_KEY`
- Resend: `RESEND_API_KEY`, `INVOICE_FROM_EMAIL`, `SUPPORT_EMAIL`
- Cloudinary: `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Stripe when payments are enabled: publishable key, secret key, price IDs and webhook secrets

Never put a server secret into an `EXPO_PUBLIC_` variable.

## Database

Apply checked-in migrations using the direct / unpooled Neon connection:

```bash
npm run db:migrate
```

The migration runner records applied filenames. The historical initial migration filename and migration-ledger table therefore remain unchanged internally even though the product and repository are BuildPair. Renaming those after they have been applied could make migrations run incorrectly.

## Authentication configuration

Configure the current production Clerk instance for:
- email address
- password
- email verification code
- Google OAuth
- Facebook OAuth

Use development/test Clerk configuration only in non-production environments. The deployed site must have its own verified production origin, OAuth client credentials and redirect URIs; native builds use the `buildpair://` callback scheme where configured.

Phone OTP can be added later if the production Clerk plan and UK SMS setup make it worthwhile, but it is not a dependency for launch.

## Payments

Stripe powers paid trade memberships, Project+ and separately approved partner directory listings. Treat subscription checkout, signed webhooks, the billing portal, cancellation and failed-payment recovery as separate journeys that require real-provider verification.

BuildPay marketplace money movement is explicitly disabled. Do not switch it on until regulatory, security, refund/dispute, Connect, deposit, payout and idempotency checks are independently complete.

## Release rule

A change is not considered release-ready merely because it renders. Before promotion it should pass the GitHub Quality workflow and the relevant test/build checks for the target environment.

For every production change, preserve a recovery ref, use a PR, verify all required checks, and confirm the exact deployed Render commit and production health. See `docs/PRODUCTION_CHECKLIST.md` for operational checks; older pre-launch entries may be superseded.
