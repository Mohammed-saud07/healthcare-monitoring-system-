from flask import Blueprint, request, jsonify
from app.services.firebase import db

thresholds_bp = Blueprint("thresholds", __name__)


@thresholds_bp.route("/api/v1/patients/<patient_id>/thresholds", methods=["GET"])
def get_thresholds(patient_id):
    thresholds = db().child(f"patients/{patient_id}/thresholds").get() or {}
    return jsonify(thresholds), 200


@thresholds_bp.route("/api/v1/patients/<patient_id>/thresholds", methods=["PUT"])
def update_thresholds(patient_id):
    data = request.get_json(force=True)
    db().child(f"patients/{patient_id}/thresholds").update(data)
    return jsonify({"status": "updated"}), 200
