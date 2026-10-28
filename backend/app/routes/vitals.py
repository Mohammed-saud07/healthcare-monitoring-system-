
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

from app.services.inference import classify_reading
from app.services.firebase import db
from app.routes.auth import require_auth, require_patient_access
from app.services.telegram import send_telegram_message

vitals_bp = Blueprint("vitals", __name__)


def is_fall_detected(value):
    if value is True:
        return True
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value == 1
    if isinstance(value, str):
        return value.strip().lower() in {"true", "yes", "1", "detected"}
    return False


@vitals_bp.route("/api/v1/vitals", methods=["POST"])
def ingest_vitals():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required"}), 400

    patient_id = data.get("patientId")
    if (
        not isinstance(patient_id, str)
        or not patient_id.strip()
        or len(patient_id) > 40
    ):
        return jsonify({"error": "A valid patientId is required"}), 400

    patient_id = patient_id.strip()
    data["patientId"] = patient_id
    data["severity"] = classify_reading(data)
    data.setdefault("timestamp", int(datetime.now(timezone.utc).timestamp() * 1000))

    # Save every submitted reading.
    db().child(f"vitals/{patient_id}").push(data)

    emergency = (
        str(data.get("severity", "")).lower() == "critical"
        or is_fall_detected(data.get("fall"))
    )

    if not emergency:
        return jsonify({
            "status": "ok",
            "severity": data["severity"],
            "alertCreated": False,
        }), 201

    # Create one alert log entry; do not write to /pending.
    alert_ref = db().child(f"alerts/{patient_id}/log").push()
    alert_id = alert_ref.key

    alert_record = {
        **data,
        "alertId": alert_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "acknowledged": False,
        "telegramStatus": "sending",
    }
    alert_ref.set(alert_record)

    fields = {
        "Heart rate": ("heartRate", "heart_rate", "hr"),
        "SpO2": ("spo2", "SpO2", "oxygenSaturation"),
        "Temperature": ("temperature", "temp"),
        "Fall detected": ("fall", "fallDetected", "fall_detected"),
    }

    lines = [
        "🚨 CAREPULSE EMERGENCY ALERT",
        f"Patient ID: {patient_id}",
        f"Severity: {data['severity']}",
    ]

    for label, keys in fields.items():
        for key in keys:
            if key in data and data[key] is not None:
                lines.append(f"{label}: {data[key]}")
                break

    lines.append("Please check on the patient promptly.")

    result = send_telegram_message("\n".join(lines))

    alert_ref.update({
        "telegramStatus": result["status"],
        "telegramMessageId": result.get("messageId"),
        "telegramError": result.get("error"),
        "notificationCompletedAt": datetime.now(timezone.utc).isoformat(),
    })

    return jsonify({
        "status": "ok",
        "severity": data["severity"],
        "alertCreated": True,
        "alertId": alert_id,
        "telegramStatus": result["status"],
    }), 201


@vitals_bp.route("/api/v1/vitals", methods=["GET"])
@require_auth
def get_vitals():
    patient_id = request.args.get("patientId")

    if not patient_id:
        return jsonify({"error": "patientId query param required"}), 400

    access_error = require_patient_access(patient_id)
    if access_error:
        return access_error

    readings = db().child(f"vitals/{patient_id}").get() or {}
    return jsonify(readings), 200
