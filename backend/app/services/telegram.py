
import json
import logging
import os
import ssl
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import certifi

logger = logging.getLogger(__name__)


def send_telegram_message(message):
    """Send one message to the configured Telegram chat."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        logger.error("Telegram configuration is missing.")
        return {
            "status": "failed",
            "error": "Telegram is not configured.",
        }

    payload = urlencode({
        "chat_id": chat_id,
        "text": str(message)[:4096],
    }).encode("utf-8")

    req = Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=payload,
        headers={
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method="POST",
    )

    context = ssl.create_default_context(cafile=certifi.where())

    try:
        with urlopen(req, context=context, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))

        if result.get("ok"):
            message_id = result.get("result", {}).get("message_id")
            logger.info("Telegram message sent successfully.")
            return {
                "status": "sent",
                "messageId": message_id,
            }

        # Avoid returning potentially sensitive request details.
        logger.warning("Telegram API rejected the message.")
        return {
            "status": "failed",
            "error": result.get("description", "Telegram rejected the message."),
        }

    except Exception as exc:
        logger.warning(
            "Telegram delivery failed (%s).", type(exc).__name__
        )
        return {
            "status": "failed",
            "error": "Telegram delivery failed. Check backend logs.",
        }


def send_telegram_alert(patient_id, data):
    """Backward-compatible emergency alert sender."""
    fields = {
        "Heart rate": (("heartRate", "heart_rate", "hr"), " bpm"),
        "SpO2": (("spo2", "SpO2", "oxygenSaturation"), "%"),
        "Temperature": (("temperature", "temp"), " °C"),
        "Fall detected": (("fall", "fallDetected", "fall_detected"), ""),
    }

    lines = [
        "🚨 CAREPULSE EMERGENCY ALERT",
        f"Patient ID: {patient_id}",
        f"Severity: {data.get('severity', 'Unknown')}",
    ]

    for label, (keys, unit) in fields.items():
        for key in keys:
            if key in data and data[key] is not None:
                lines.append(f"{label}: {data[key]}{unit}")
                break

    lines.append("Please check on the patient promptly.")

    result = send_telegram_message("\n".join(lines))
    return result["status"] == "sent"
