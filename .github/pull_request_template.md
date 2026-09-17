## What changed

<!-- Describe the user-visible and technical change. -->

## Production safety checklist

- [ ] Authentication and authorisation are enforced server-side for protected data/actions.
- [ ] User-controlled content is treated as untrusted input and cannot grant permissions or trigger privileged actions.
- [ ] No API keys, secrets, tokens or private configuration are exposed to the client, logs or AI prompts.
- [ ] New or expensive public endpoints have appropriate validation, abuse/rate limiting and bounded inputs.
- [ ] State-changing or destructive operations fail closed and have appropriate confirmation/audit behaviour.
- [ ] Data access is scoped to the authenticated user/role; object IDs alone never grant access.
- [ ] Error messages do not leak secrets or unnecessary internal details.
- [ ] Database/schema changes are backward-compatible or have an explicit migration/rollback plan.
- [ ] Existing live user journeys remain compatible during deployment.
- [ ] Lint, TypeScript, automated tests and required web/native builds pass.
- [ ] Production dependency audit has no unresolved high/critical finding introduced by this change.
- [ ] Render/production deployment is verified after merge, including the affected live journey.
- [ ] Rollback path is understood before merge.

## AI-specific checks (when applicable)

- [ ] AI output is not used as an authorisation decision.
- [ ] AI-proposed links/actions are resolved through server-controlled allowlists/schemas.
- [ ] Prompt-injected content cannot directly execute privileged operations.
- [ ] Privileged AI actions require authenticated server-side checks and explicit human confirmation.
- [ ] AI requests/responses are appropriately bounded, rate-limited and audited without storing secrets.

## Verification

<!-- Note tests run and the live verification performed after deployment. -->
