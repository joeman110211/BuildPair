# BuildPair

BuildPair is a UK-focused homeowner and tradesperson marketplace built from one Expo / React Native codebase for Android, iOS and web.

It connects the whole job journey rather than stopping at lead generation: discovery, job planning, structured quotes, messaging, approved changes, project timelines, payment stages, reviews and trade-business tools can stay attached to one project record.

Repository: `joeman110211/BuildPair`

## Current product and hosting

BuildPair is in a public quiet-launch / pre-release phase.

- `https://www.buildpair.co.uk` is the canonical public web app and API origin.
- `https://buildpair.co.uk` redirects to `www`.
- `https://admin.buildpair.co.uk` is the dedicated owner/admin hostname when its DNS record is configured.
- The public host deliberately blocks `/admin` and `/api/admin/*`.
- Production is packaged with Docker and Caddy; the application and Expo Router API run together behind HTTPS.
- Search indexing can remain disabled during quiet launch while the product is tested and polished.
- Bundled preview marketplace fixtures are for staging/local preview only and must never be presented as genuine production activity.

The older Chromebook-hosting documents remain useful for local/private testing and recovery, but the Chromebook is no longer the intended public production host.

## Product structure

### Public marketplace

- Responsive BuildPair landing site and public information/legal pages.
- 33 broad trade categories with detailed services beneath them.
- Smart trade search that understands related work and plain-English job descriptions.
- Public tradesperson directory and detailed profiles.
- Public job browsing with privacy-safe location information.
- Contact form delivered through Resend when configured.
- PWA manifest, icons and installable web experience.

### Accounts and authentication

- Clerk email/password authentication with email-code verification.
- Google and Facebook social sign-in where enabled in Clerk.
- One identity can enable Homeowner, Tradesperson, or both account modes.
- Account mode persists and users can switch between enabled modes.
- Suspended accounts are rejected by protected server routes.
- A separate administrator flow protects the owner console.

### Homeowners

- Create, save and manage jobs.
- Add photos and postcode-based location data.
- Use AI assistance to turn a rough description into a clearer job specification.
- Find relevant tradespeople and request quotes directly.
- Receive, compare and accept structured quotes.
- Message in a job-scoped conversation.
- Keep timeline events, approved variations and payment stages connected to the job.
- Confirm supported payment activity and leave verified reviews after qualifying completed work.
- Save tradespeople and manage notifications.

### Tradespeople

- Structured business-profile onboarding with a minimum 50-character bio.
- Broad categories plus detailed service selections, service radius and service areas.
- Cover image, profile image, logo, work gallery, before/after projects and project stories.
- Qualifications, credential submissions, register links and social links.
- Job board, saved searches, availability, quote creation, messaging, job management and invoices.
- AI-assisted quote wording and message replies with deterministic financial calculations.
- Business analytics and marketplace alerts where included by plan.

### Memberships

Database values remain `free`, `basic` and `featured` for compatibility, but the product-facing plans are:

| Plan | Monthly price | Main categories | Open-marketplace offers | Key marketplace position |
| --- | ---: | ---: | ---: | --- |
| Starter | £0 | 2 | 0 | Profile setup, marketplace browsing and external profile sharing |
| BuildPair Plus | £19.99 | 4 | 15/month | Searchable profile, direct quote requests, messaging and AI reply tools |
| BuildPair Pro | £29.99 | 6 | 35/month | Plus features, modest search boost, advanced analytics and priority alerts |

Direct homeowner quote requests do not consume the monthly open-marketplace offer allowance. Main-category changes use a 14-day cooldown; services within an already selected category can be maintained separately.

Annual billing, VAT presentation and final paid-launch cancellation/refund wording should only be published once those commercial terms are implemented and approved.

### Trust, moderation and operations

- Credential submission, moderation and expiry handling.
- Verified-review eligibility tied to qualifying marketplace project activity.
- User reporting and evidence-led moderation workflows.
- Admin user management, suspension/restoration and operational views.
- Presence, notifications and system-health checks.
- Rate limiting, security headers and privacy-safe public location handling.
- Account deletion workflow.

## Core services

BuildPair currently contains integration paths for:

- **Clerk**: authentication and identity.
- **Neon Postgres + Drizzle**: application data and migrations.
- **Cloudinary**: media uploads.
- **Resend**: transactional/contact/invoice email.
- **Google Gemini**: constrained AI assistance with deterministic/rule-based fallbacks where appropriate.
- **Stripe**: subscriptions, billing portal, Connect onboarding and marketplace payment infrastructure.

A feature should not be described as operational in a target environment merely because code exists for it. Provider configuration and end-to-end checks still matter, because software remains annoyingly literal about such things.

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

Copy `.env.example` to a local ignored environment file and configure only the services required by that environment.

### Core connected environment

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` for migrations

### Feature-specific

- Gemini: `GEMINI_API_KEY`
- Resend: `RESEND_API_KEY`, `INVOICE_FROM_EMAIL`, `SUPPORT_EMAIL`
- Cloudinary: `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Stripe when billing/payments are enabled: publishable key, secret key, price IDs and webhook secrets

Never put a server secret into an `EXPO_PUBLIC_` variable.

For real public production, keep `BUILDPAIR_PREVIEW_DATA_ENABLED=false`. The application also hard-blocks preview fixtures on the canonical production hostnames as a defence against stale deployment configuration.

## Database

Apply checked-in migrations using the direct/unpooled Neon connection:

```bash
npm run db:migrate
```

Migration filenames and historical internal database values are compatibility contracts. Do not rename old applied migrations simply to make their labels prettier.

## Authentication configuration

Configure Clerk for the sign-in methods enabled by the product and register the production web/native callback origins. The native app uses the `buildpair://` callback scheme.

The complete user journey that matters is:

`sign up/sign in → choose or restore account mode → /api/me succeeds → mode persists → correct dashboard opens`

Administrator access is separate and must remain restricted to the dedicated admin surface and authorised admin accounts.

## Payments

Stripe integration code exists for subscriptions, billing portal access, Connect onboarding and job PaymentIntents. Before enabling or expanding live money movement, verify subscription lifecycle, webhooks, Connect onboarding, deposits, balances, refunds, failures and idempotency in the actual target environment.

## Release rule

A change is not release-ready merely because it renders.

Before promotion, run the GitHub quality checks and the relevant target-specific build/E2E checks. Native APK/AAB changes also require install/build proof, and important journeys should be checked on a physical device before public release.

See `docs/PRODUCTION_HOSTING.md` and `docs/PRODUCTION_CHECKLIST.md` for the production shape and release gates.
