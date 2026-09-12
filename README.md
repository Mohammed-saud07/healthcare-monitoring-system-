# Smart AI-Powered Healthcare Monitoring and Emergency Assistance System

Full project scaffold — hardware firmware, ML training, backend API,
alert orchestration, mobile app, and web dashboard — matching the
development process already worked out for this build.

```
healthcare-monitoring-system/
  firmware/       Arduino/ESP32 sketches (sensors, fall detection, WiFi POST)
  ml/             Python training scripts for the 3 models
  backend/        Flask REST API (Blueprints: vitals, alerts, auth, thresholds)
  functions/      Firebase Cloud Function for SMS/email/push alerting
  mobile/         Flutter starting point (live dashboard screen)
  web/            React dashboard components (multi-patient view)
  .env.example    Copy to .env and fill in real values - never commit .env
```

Everything here is a **working starting point**, not a finished app — each
file has comments marking what to replace (datasets, credentials, the
remaining screens/components). Build it in the order below.

---

## Build Order

### Phase 0 — Accounts & Environment (Day 0)
1. Create a **Firebase** project (console.firebase.google.com): enable
   Realtime Database, Firestore, Cloud Messaging; upgrade to Blaze plan
   (needed for Cloud Functions calling Twilio/SendGrid).
2. Get your Firebase credentials: register a Web app for React, an
   Android/iOS app for Flutter, and generate a **service account key**
   (Project Settings → Service Accounts) for the backend — save it as
   `backend/firebase-service-account.json` (already gitignored).
3. Create a **Twilio** trial account, buy a number, verify your test
   phone numbers under Verified Caller IDs.
4. Create a **SendGrid** account, verify a single sender, generate an
   API key with Mail Send permission only.
5. `cp .env.example .env` and fill in the values you just collected.
6. Install Python 3.11, Node.js LTS, Flutter SDK, and VS Code with the
   Flutter/Python/PlatformIO extensions.

### Phase 1 — Hardware & Firmware (Day 0–4)
Work through `firmware/` in order:
1. `firmware/i2c_scanner/` — confirm both sensors show up on the I2C bus
   (MAX30102 at `0x57`, MPU6050 at `0x68`)
2. `firmware/combined_sensors_fall_detection/` — heart rate + fall
   detection on Serial Monitor only, no networking yet
3. `firmware/wifi_post_final/` — fill in your WiFi SSID/password, your
   backend's local IP, and (if using auth) a JWT — this is the sketch
   you actually flash for the live demo

### Phase 2 — ML Models (Day 3–8, parallel with hardware)
```bash
cd ml
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python train_anomaly_classifier.py   # -> anomaly_classifier.pkl
python train_fall_lstm.py            # -> fall_lstm.h5 (real metrics for Chapter 8)
python train_risk_regressor.py       # -> risk_regressor.pkl
```
Copy `anomaly_classifier.pkl` and `anomaly_classifier_features.pkl` into
`backend/app/models/` once trained — the backend falls back to a simple
rule-based classifier until it finds them, so the pipeline still runs
end-to-end while you're training.

### Phase 3 — Backend API (Day 5–8)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python wsgi.py
```
Test with curl:
```bash
curl -X POST http://localhost:5000/api/v1/vitals \
  -H "Content-Type: application/json" \
  -d '{"patientId":"P001","heartRate":78,"spo2":98,"temperature":36.8,"fall":false}'
```

### Phase 4 — Alert Orchestration (Day 7–9)
See `functions/README.md` — set your Twilio/SendGrid config, then
`firebase deploy --only functions`.

### Phase 5 — Mobile App (Day 8–14)
See `mobile/README.md` — `flutter create .`, add Firebase packages,
run `flutterfire configure`, then build out the remaining screens.

### Phase 6 — Web Dashboard (Day 10–14, parallel with mobile)
```bash
cd web
npx create-react-app . --template minimal   # or merge into an existing CRA app
npm install
# copy src/components and src/services from this scaffold in
npm start
```

### Phase 7 — Integration (Day 12–15)
Confirm each hop works end to end: ESP32 → Flask → Firebase → Cloud
Function → SMS/email/push → mobile + web dashboards.

### Phase 8 — Testing (Day 15–17)
Unit tests (`pytest` for Flask, `flutter test` for the app), then the
integration paths above, then a full system run-through.

### Phase 9 — Demo Prep (Day 17–18)
2-minute live demo script: normal reading → simulated fall/anomaly →
alert fires on phone + dashboard. Update your report's Chapter 6 with
the Hardware Validation notes below.

---

## What to Say in Your Report / Viva

1. **ESP32 → Flask directly, no physical Raspberry Pi edge tier** in
   the built prototype — documented as a Phase I scope decision, with
   the edge-inference tier remaining part of the target architecture.
2. **Threshold-based fall detection on the physical device**, while the
   LSTM (`ml/train_fall_lstm.py`) is trained and evaluated in software
   with real accuracy/ROC-AUC numbers for Chapter 8.

Report exactly what's real hardware and what's software-validated —
that's a stronger viva answer than implying everything was physically
built.
