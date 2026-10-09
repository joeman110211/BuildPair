# BuildPair launch audit — 9 October 2026

## Current state

Baseline: live main release `4cf0058c390fc7a9843f0781860477efac66b487`. Historical plans and September checklists are not the current product. This audit does not certify every feature, device, account or historical discussion.

The marketplace and both registrations are open. BuildPay remains disabled. The existing admin release aligns navigation, dashboards, visitors, system health, QA routes and archive wording with the live marketplace. Tested admin APIs reject signed-out access. Tradespeople retain three months of introductory Pro from profile activation, without a card or automatic paid subscription. Paid trade checkout remains gated while Stripe credentials are missing. Project+ billing now has an independent gate; complimentary homeowner access remains available while that gate is closed.

## Completed in this change

- Enforced the configured Clerk issuer and approved origins on both verification paths; rejected unapproved cookie-authenticated write origins.
- Unified trade checkout; verified configured GBP monthly prices, reused open checkouts and routed existing subscribers to the portal to avoid duplicate subscriptions.
- Made webhook processing failures retryable, retrieved current subscription state for delayed events and derived membership from billed prices instead of stale metadata. Preserved introductory access without making it permanent. Delayed cancellations cannot revoke replacement contracts.
- Added Project+ billing portal access for both account modes. Signed webhooks grant entitlements; checkout redirects do not.
- Reserved Project+ quotas atomically before AI calls, used actual entitlement limits and refunded failed unsaved attempts. Validated planner output and added status-load recovery and exhausted-plan button handling.
- Added conditional readiness requirements for enabled billing products. Native paid-purchase links stay hidden.
- Verified and installed existing live Stripe price mappings in Render: Core £9.99, Plus £19.99, Pro £29.99 and Project+ £4.99 per month.
- Configured the live Stripe portal for period-end cancellation and Core/Plus/Pro changes, with quantity changes disabled and BuildPair policy/return URLs.

## Verification

| Check | Result and scope |
| --- | --- |
| Regression suite | 158 tests in 27 files passed |
| TypeScript | Passed |
| ESLint | No errors; existing warnings remain |
| Production web export | Passed |
| Public HTTP pages | 23 returned 200; security response headers checked |
| Marketplace APIs | Jobs, directory and featured trades returned 200 |
| Private API boundaries | 11 tested signed-out GET requests returned 401, including admin overview/system health |
| Closed gates | Trade checkout and three BuildPay-related routes returned 423 |
| Literal navigation scan | No unresolved scanned href/push/replace destinations; dynamic paths require journeys |
| Live browser | Homepage, directory, public profile, Advice Hub search and both role-specific signup forms rendered; no accounts or purchases created |
| Neon readiness | Connected; all 56 migrations through 0054 present; 55 tables, 180 indexes; no unvalidated foreign keys or idle transactions in snapshot |
| Recovery point | Existing launch safety branch observed; restore rehearsal not performed |

Public and database snapshots above were taken against the baseline deployment. After release, check exact release SHA, health/readiness and disabled payment gates again. Tests cover concurrent Project+ quotas/refunds, checkout retries, price validation, webhook changes/cancellations/retries and Clerk boundaries. Mocks do not replace real Stripe delivery or signed-in journeys.

## Open issues

1. **Stripe credentials:** Render lacks `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. An authorised operator must enter them securely in Render, never chat or Git. The existing platform webhook targets `/api/stripe/webhook`; use its signing secret. BuildPay Connect and its gate stay disabled. Hosted Checkout does not require an embedded publishable key.
2. **Billing journeys:** Run sandbox checkout, signed webhook activation, portal upgrades/downgrades/cancellation and failed-payment recovery before enabling either paid flag. Use matching sandbox price IDs, then confirm live credentials/mappings and delivery. No live charge was made in this audit.
3. **Dependency security:** Production npm audit reported 29 vulnerable dependency nodes (18 high, 11 moderate), in upstream braces, node-forge, uuid and decode-uri-component chains. Several lack a compatible fix; no forced Expo major upgrade or audit suppression was applied. The decoder includes a runtime path and remains material. The dependency audit gate is not green.
4. **Signed-in QA:** Designated homeowner, trade and admin test sessions are needed for posting, quotes, messages, files, project records, moderation and admin mutations without interfering with customers.
5. **Device/layout QA:** Desktop public pages inspected; a fresh mobile/tablet/native screen matrix remains outstanding. Earlier responsive reports are historical evidence only.
6. **Operations:** The application DB role has bypass-RLS privileges; this is not a full least-privilege review, penetration test or restore certification. Optional `CRON_SECRET` and unpooled database configuration were absent; validate maintenance scheduling and recovery separately.

## Backlog and launch decision

Keep the marketplace open and BuildPay off. Paid subscriptions are not activated until credentials, real-provider tests and deliberate paid-gate activation are complete. Security is not fully signed off while the audit and authenticated checks remain open.

BuildPair's own software fees are separate from receiving customer-to-tradesperson payments. FCA PERG 15.3 explains that accepting card payment for one's own goods/services generally does not make a merchant a payment-services provider. This supports ordinary membership/Project+ billing; it does not authorise BuildPay. Consumer contract, renewal, cancellation, data-protection and tax obligations still apply.

Primary reference: https://handbook.fca.org.uk/handbook/perg15/perg15s3
