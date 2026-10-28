
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

from app.services.firebase import db
from app.services.telegram import send_telegram_message
from app.routes.auth import require_auth, require_patient_access

alerts_bp = Blueprint("alerts", __name__)

STAFF_ROLES = {"admin", "doctor", "caregiver"}


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def current_user():
    return getattr(request, "firebase_user", {}) or {}


def staff_error():
    if current_user().get("role") not in STAFF_ROLES:
        return jsonify({"error": "Staff access required"}), 403
    return None


@alerts_bp.route("/api/v1/alerts/<patient_id>", methods=["GET"])
@require_auth
def get_alerts(patient_id):
    access_error = require_patient_access(patient_id)
    if access_error:
        return access_error

    log = db().child(f"alerts/{patient_id}/log").get() or {}
    return jsonify(log if isinstance(log, dict) else {}), 200


@alerts_bp.route(
    "/api/v1/alerts/<patient_id>/acknowledge",
    methods=["POST"],
)
@require_auth
def acknowledge_alert(patient_id):
    access_error = require_patient_access(patient_id)
    if access_error:
        return access_error

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required"}), 400

    alert_id = data.get("alertId")
    if not isinstance(alert_id, str) or not alert_id.strip():
        return jsonify({"error": "A valid alertId is required"}), 400

    alert_ref = db().child(f"alerts/{patient_id}/log/{alert_id}")
    alert = alert_ref.get()

    if not isinstance(alert, dict):
        return jsonify({"error": "Alert not found"}), 404

    user = current_user()
    alert_ref.update({
        "acknowledged": True,
        "acknowledgedAt": utc_now(),
        "acknowledgedBy": user.get("uid", "unknown"),
    })

    return jsonify({"status": "acknowledged"}), 200


@alerts_bp.route(
    "/api/v1/alerts/<patient_id>/messages",
    methods=["GET"],
)
@require_auth
def get_message_history(patient_id):
    access_error = require_patient_access(patient_id)
    if access_error:
        return access_error

    history = db().child(f"messages/{patient_id}/log").get() or {}
    return jsonify(history if isinstance(history, dict) else {}), 200


@alerts_bp.route(
    "/api/v1/alerts/<patient_id>/messages",
    methods=["POST"],
)
@require_auth
def send_custom_message(patient_id):
    error = staff_error()
    if error:
        return error

    access_error = require_patient_access(patient_id)
    if access_error:
        return access_error

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required"}), 400

    message = data.get("message")
    if not isinstance(message, str):
        return jsonify({"error": "Message must be text"}), 400

    message = message.strip()
    if not message or len(message) > 3000:
        return jsonify({
            "error": "Message must contain 1 to 3000 characters"
        }), 400

    profile = db().child(f"patients/{patient_id}").get()
    if not isinstance(profile, dict):
        return jsonify({"error": "Patient not found"}), 404

    user = current_user()
    patient_name = str(profile.get("name") or patient_id)

    # Custom messages are not written to the emergency pending path.
    telegram_text = (
        "💬 CarePulse message\n"
        f"Patient: {patient_name} ({patient_id})\n\n"
        f"{message}"
    )

    created_at = utc_now()
    history_ref = db().child(f"messages/{patient_id}/log").push()
    message_id = history_ref.key

    # Save the attempt before sending so failed attempts are retained.
    history_ref.set({
        "messageId": message_id,
        "patientId": patient_id,
        "patientName": patient_name,
        "message": message,
        "senderUid": user.get("uid", "unknown"),
        "senderRole": user.get("role", "unknown"),
        "recipient": "configured Telegram chat",
        "channel": "Telegram",
        "status": "sending",
        "createdAt": created_at,
        "relatedAlertId": (
            data.get("relatedAlertId")
            if isinstance(data.get("relatedAlertId"), str)
            else None
        ),
    })

    result = send_telegram_message(telegram_text)

    history_ref.update({
        "status": result["status"],
        "telegramMessageId": result.get("messageId"),
        "error": result.get("error"),
        "completedAt": utc_now(),
    })

    status_code = 200 if result["status"] == "sent" else 502

    return jsonify({
        "messageId": message_id,
        "status": result["status"],
        "error": result.get("error"),
    }), status_code
