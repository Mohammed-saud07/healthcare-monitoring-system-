const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio")(
  functions.config().twilio.sid,
  functions.config().twilio.token
);
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(functions.config().sendgrid.key);

admin.initializeApp();

const TWILIO_FROM = functions.config().twilio.from_number;
const SENDER_EMAIL = functions.config().sendgrid.sender;
const PROVIDER_EMAIL = functions.config().app.provider_email;

exports.onAlertPending = functions.database
  .ref("/alerts/{patientId}/pending/{pushId}")
  .onCreate(async (snapshot, context) => {
    const alert = snapshot.val();
    const { patientId } = context.params;

    let contacts = { docs: [] };
    try {
      contacts = await admin
        .firestore()
        .collection("patients")
        .doc(patientId)
        .collection("emergencyContacts")
        .get();
    } catch (err) {
      console.error("Could not load emergency contacts:", err);
    }

    let location = null;
    try {
      location = (
        await admin.database().ref(`/location/${patientId}`).once("value")
      ).val();
    } catch (err) {
      console.error("Could not load location:", err);
    }

    const message =
      `ALERT: ${alert.severity || "FALL"} event for patient ${patientId}. ` +
      `HR: ${alert.heartRate}, SpO2: ${alert.spo2}. ` +
      (location ? `Location: https://maps.google.com/?q=${location.lat},${location.lng}` : "");

    // SMS - wrapped so a missing/invalid Twilio trial number doesn't kill the whole function
    for (const doc of contacts.docs || []) {
      try {
        await twilio.messages.create({
          body: message,
          from: TWILIO_FROM,
          to: doc.data().phone,
        });
      } catch (err) {
        console.error(`SMS to ${doc.id} failed:`, err.message);
      }
    }

    // Email
    try {
      await sgMail.send({
        to: PROVIDER_EMAIL,
        from: SENDER_EMAIL,
        subject: "Patient Alert",
        text: message,
      });
    } catch (err) {
      console.error("SendGrid email failed:", err.message);
    }

    // TODO: FCM push to caregiver app tokens - fetch tokens from
    // /patients/{patientId}/caregiverTokens and admin.messaging().sendMulticast(...)

    // Always write the log entry, even if a channel above failed
    // (graceful degradation, matches the report's design)
    await admin
      .database()
      .ref(`/alerts/${patientId}/log`)
      .push({ ...alert, sentAt: Date.now() });
  });
