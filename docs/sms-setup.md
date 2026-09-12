# BuildPair SMS setup (Twilio)

BuildPair's SMS integration is provider-gated. Until all Twilio server variables are present, public waitlist users can still save an optional mobile number, but **Text** and **Both** stay disabled automatically.

## Recommended UK setup

Use Twilio Programmable Messaging with a **Messaging Service** and the branded Alphanumeric Sender ID **BuildPair**. This is intended for one-way launch, early-access and important service notifications.

Alphanumeric Sender IDs are one-way. BuildPair SMS copy therefore gives `info@buildpair.co.uk` as an alternative opt-out/contact route. Do not use the service-message consent collected by the waitlist as permission for unrelated marketing SMS.

## Twilio Console

1. Create or sign in to the Twilio account and upgrade it from trial if required for Alphanumeric Sender IDs.
2. Open **Messaging → Services** and create a Messaging Service for BuildPair.
3. Set the use case to notifications/transactional messaging.
4. Enable/add an Alphanumeric Sender ID and use `BuildPair` as the requested sender name.
5. Complete any UK Sender ID registration/Trust Hub steps Twilio requires. Protected Sender IDs may require a Letter of Authorisation.
6. Add the approved Alphanumeric Sender ID to the Messaging Service sender pool.
7. Copy the Messaging Service SID (`MG...`).
8. From the Twilio Account dashboard, copy the Account SID (`AC...`) and Auth Token.

## Render production environment

Add these **server-only** environment variables to the `buildpair` production service:

```text
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_MESSAGING_SERVICE_SID=MG...
```

Never commit the SID/token values to GitHub. Save the Render environment changes and allow the service to restart.

If staging should also send real SMS, add separate/test-safe credentials to the staging service deliberately. Otherwise leave its Twilio values blank.

## What changes automatically after configuration

`GET /api/contact-options` reports SMS as enabled, so the public waitlist immediately enables **Text** and **Both** without another code change.

Waitlist entries store their requested contact method separately from marketing consent. Admin → Launch Waitlist shows the contact choice and SMS readiness. Early-access invitations can be sent by email, SMS or both. A phone-only early-access invite asks the recipient to add and verify the email address they want to use for their BuildPair account after opening the secure SMS link.

## Smoke test

1. Open the production waitlist on a phone/private browser.
2. Confirm **Email**, **Text** and **Both** are enabled.
3. Choose **Text**, enter a UK mobile, and join using a test entry you can identify and remove/manage later.
4. In Admin → Launch Waitlist, confirm the record shows **Text**.
5. Grant early access to that test record.
6. Confirm the branded SMS arrives and the secure link opens the early-access account-email step.
7. Confirm the admin record changes from **Text pending** to **Text sent**.

If Twilio rejects a request, BuildPair does not expose Twilio credentials to the browser. The server logs a delivery error and the admin page keeps the invite in a pending state so it can be retried after the provider setup is corrected.
