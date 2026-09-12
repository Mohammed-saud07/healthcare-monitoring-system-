from flask import Blueprint, request, jsonify
from app.services.firebase import db

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.route("/api/v1/alerts/<patient_id>", methods=["GET"])
def get_alerts(patient_id):
    log = db().child(f"alerts/{patient_id}/log").get() or {}
    return jsonify(log), 200


@alerts_bp.route("/api/v1/alerts/<patient_id>/acknowledge", methods=["POST"])
def acknowledge_alert(patient_id):
    data = request.get_json(force=True)
    alert_id = data.get("alertId")
    if not alert_id:
        return jsonify({"error": "alertId required"}), 400
    db().child(f"alerts/{patient_id}/log/{alert_id}/acknowledged").set(True)
    return jsonify({"status": "acknowledged"}), 200
