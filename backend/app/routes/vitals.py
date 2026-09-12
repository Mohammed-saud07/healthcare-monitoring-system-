from flask import Blueprint, request, jsonify
from app.services.inference import classify_reading
from app.services.firebase import db

vitals_bp = Blueprint("vitals", __name__)


@vitals_bp.route("/api/v1/vitals", methods=["POST"])
def ingest_vitals():
    data = request.get_json(force=True)

    required = ["patientId"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"missing fields: {missing}"}), 400

    severity = classify_reading(data)
    data["severity"] = severity

    patient_id = data["patientId"]
    db().child(f"vitals/{patient_id}").push(data)

    if severity == "Critical" or data.get("fall"):
        db().child(f"alerts/{patient_id}/pending").push(data)

    return jsonify({"status": "ok", "severity": severity}), 201


@vitals_bp.route("/api/v1/vitals", methods=["GET"])
def get_vitals():
    patient_id = request.args.get("patientId")
    if not patient_id:
        return jsonify({"error": "patientId query param required"}), 400
    readings = db().child(f"vitals/{patient_id}").get() or {}
    return jsonify(readings), 200
