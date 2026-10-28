
from flask import Blueprint, request, jsonify

from app.services.firebase import db
from app.routes.auth import require_auth, require_patient_access

thresholds_bp = Blueprint("thresholds", __name__)


@thresholds_bp.route(
    "/api/v1/patients/<patient_id>/thresholds",
    methods=["GET"],
)
@require_auth
def get_thresholds(patient_id):
    access_error = require_patient_access(patient_id)
    if access_error:
        return access_error

    thresholds = db().child(
        f"patients/{patient_id}/thresholds"
    ).get() or {}

    return jsonify(thresholds), 200


@thresholds_bp.route(
    "/api/v1/patients/<patient_id>/thresholds",
    methods=["PUT"],
)
@require_auth
def update_thresholds(patient_id):
    access_error = require_patient_access(patient_id)
    if access_error:
        return access_error

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            "error": "A non-empty JSON object is required"
        }), 400

    db().child(
        f"patients/{patient_id}/thresholds"
    ).update(data)

    return jsonify({"status": "updated"}), 200
