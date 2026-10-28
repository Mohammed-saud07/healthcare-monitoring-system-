
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  defineSecret,
  defineString,
} = require("firebase-functions/params");

admin.initializeApp();

// Must match your Firebase Realtime Database region.
const DB_REGION = "us-central1";

// Telegram credentials remain server-side.
const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");

const TELEGRAM_CHAT_ID = defineString("TELEGRAM_CHAT_ID", {
  default: "DISABLED",
});

/**
 * Send a Telegram message.
 * Used only by the scheduled demo function in this file.
 * Real emergency and custom messages are handled by Flask.
 */
async function sendTelegram(message) {
  const token = TELEGRAM_BOT_TOKEN.value();
  const chatId = TELEGRAM_CHAT_ID.value();

  if (
    !token ||
    token === "DISABLED" ||
    !chatId ||
    chatId === "DISABLED"
  ) {
    throw new Error("Telegram is not configured.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: String(message).slice(0, 4096),
      }),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      `Telegram delivery failed: ${
        result.description || `HTTP ${response.status}`
      }`
    );
  }

  return {
    messageId: result.result.message_id,
  };
}

/**
 * CarePulse demo notifications.
 *
 * These are simulated values, not actual patient readings.
 * This function does not write simulated readings to Firebase
 * and does not create or process emergency alerts.
 */
exports.sendCarePulseDemoTelegram = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Kolkata",
    region: DB_REGION,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async () => {
    const patientsSnapshot = await admin
      .database()
      .ref("/patients")
      .once("value");

    const patients = patientsSnapshot.val();

    if (
      !patients ||
      typeof patients !== "object" ||
      Array.isArray(patients)
    ) {
      console.log("Demo Telegram: no registered patients found.");
      return;
    }

    const patientIds = Object.keys(patients);

    if (patientIds.length === 0) {
      console.log("Demo Telegram: patient list is empty.");
      return;
    }

    const openings = [
      "CarePulse demo check-in",
      "Your CarePulse presentation update",
      "CarePulse simulated health summary",
      "CarePulse demo monitoring report",
      "CarePulse status update — DEMO",
    ];

    const fallStatuses = [
      "Simulated fall status: clear",
      "Demo fall monitoring: no fall indicated",
      "No simulated fall detected",
    ];

    for (const patientId of patientIds) {
      // Random demo values only. Never used for emergency decisions.
      const heartRate = 65 + Math.floor(Math.random() * 36);
      const spo2 = 95 + Math.floor(Math.random() * 6);
      const temperature =
        Math.round((36.2 + Math.random() * 1.5) * 10) / 10;

      const opening =
        openings[Math.floor(Math.random() * openings.length)];

      const fallStatus =
        fallStatuses[Math.floor(Math.random() * fallStatuses.length)];

      const message = [
        "SIMULATED DEMO DATA ",
        "",
        `🩺 ${opening}`,
        `Patient ID: ${patientId}`,
        `Heart rate: ${heartRate} BPM (simulated)`,
        `SpO₂: ${spo2}% (simulated)`,
        `Temperature: ${temperature.toFixed(1)} °C (simulated)`,
        fallStatus,
        "",
        `Demo message time: ${new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}`,
        "For project presentation only. ",
      ].join("\n");

      try {
        const result = await sendTelegram(message);

        console.log(
          `Demo Telegram sent for ${patientId}; ` +
          `message ID: ${result.messageId}`
        );
      } catch (error) {
        // Do not log the bot token or request URL.
        console.error(
          `Demo Telegram failed for ${patientId}:`,
          error.message
        );
      }
    }
  }
);
