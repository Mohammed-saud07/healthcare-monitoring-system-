# Firebase Cloud Functions - Alert Orchestration

## Setup

```bash
npm install -g firebase-tools
firebase login
firebase init functions   # choose this project, JavaScript, install deps
```

Set your secrets as Cloud Functions config (do NOT hardcode them in index.js):

```bash
firebase functions:config:set \
  twilio.sid="ACxxxx" \
  twilio.token="xxxx" \
  twilio.from_number="+1xxxxxxxxxx" \
  sendgrid.key="SG.xxxx" \
  sendgrid.sender="you@verifiedsender.com" \
  app.provider_email="provider@example.com"
```

Deploy:

```bash
firebase deploy --only functions
```

Test by manually writing a record to `/alerts/{patientId}/pending` in the
Firebase console's Realtime Database tab - it should trigger `onAlertPending`
within a few seconds.
