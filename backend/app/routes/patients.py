import re
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

from app.services.firebase import db
from app.routes.auth import require_auth, require_patient_access

patients_bp = Blueprint("patients", __name__)

STAFF_ROLES = {"admin", "doctor", "caregiver"}


def staff_user():
    user = getattr(request, "firebase_user", None)
    if not user:
        return None, (jsonify({"error": "Authentication required"}), 401)

    if user.get("role") not in STAFF_ROLES:
        return None, (jsonify({"error": "Staff access required"}), 403)

    return user, None


@patients_bp.route("/api/v1/patients", methods=["GET"])
@require_auth
def list_patients():
    user, error = staff_user()
    if error:
        return error

    all_patients = db().child("patients").get() or {}

    if not isinstance(all_patients, dict):
        all_patients = {}

    role = user.get("role")

    if role == "admin":
        visible = all_patients
    else:
        assigned = user.get("patientIds", [])
        if not isinstance(assigned, list):
            assigned = []
        visible = {
            patient_id: profile
            for patient_id, profile in all_patients.items()
            if patient_id in assigned
        }

    # Do not expose thresholds through the patient-list response.
    result = {}
    for patient_id, profile in visible.items():
        if isinstance(profile, dict):
            result[patient_id] = {
                key: profile.get(key)
                for key in (
                    "patientId", "name", "age", "gender",
                    "phone", "createdAt"
                )
                if profile.get(key) is not None
            }

    return jsonify(result), 200


@patients_bp.route("/api/v1/patients", methods=["POST"])
@require_auth
def register_patient():
    user, error = staff_user()
    if error:
        return error

    # Only admins may create patient profiles in this initial version.
    if user.get("role") != "admin":
        return jsonify({
            "error": "Only administrators can register patients"
        }), 403

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required"}), 400

    patient_id = str(data.get("patientId", "")).strip()
    name = str(data.get("name", "")).strip()
    age = data.get("age")
    gender = str(data.get("gender", "")).strip()
    phone = str(data.get("phone", "")).strip()
    medical_notes = str(data.get("medicalNotes", "")).strip()

    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", patient_id):
        return jsonify({
            "error": "patientId must be 1–40 letters, numbers, _ or -"
        }), 400

    if not name or len(name) > 120:
        return jsonify({"error": "A valid patient name is required"}), 400

    if isinstance(age, bool) or not isinstance(age, int) or not 0 <= age <= 125:
        return jsonify({"error": "Age must be a whole number from 0 to 125"}), 400

    if gender not in {"Male", "Female", "Other", "Prefer not to say"}:
        return jsonify({"error": "Select a valid gender option"}), 400

    if len(phone) > 30 or len(medical_notes) > 2000:
        return jsonify({"error": "Phone or medical notes are too long"}), 400

    patient_ref = db().child(f"patients/{patient_id}")

    if patient_ref.get() is not None:
        return jsonify({"error": "This patient ID already exists"}), 409

    profile = {
        "patientId": patient_id,
        "name": name,
        "age": age,
        "gender": gender,
        "phone": phone,
        "medicalNotes": medical_notes,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdBy": user.get("uid"),
    }

    patient_ref.set(profile)

    return jsonify({
        "status": "created",
        "patient": {
            key: profile[key]
            for key in (
                "patientId", "name", "age", "gender", "phone", "createdAt"
            )
        }
    }), 201



def can_edit_patient(user, patient_id):
    """Admins can edit any patient; doctors can edit assigned patients."""
    role = user.get("role")

    if role == "admin":
        return True

    if role == "doctor":
        assigned = user.get("patientIds", [])
        return isinstance(assigned, list) and patient_id in assigned

    return False


@patients_bp.route("/api/v1/patients/<patient_id>", methods=["PUT"])
@require_auth
def update_patient(patient_id):
    user, error = staff_user()
    if error:
        return error

    if not can_edit_patient(user, patient_id):
        return jsonify({"error": "You are not authorized to edit this patient"}), 403

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON object is required"}), 400

    patient_ref = db().child(f"patients/{patient_id}")
    existing = patient_ref.get()

    if not isinstance(existing, dict):
        return jsonify({"error": "Patient not found"}), 404

    # Only accept editable fields; never allow changing patientId or audit fields.
    updates = {}

    if "name" in data:
        name = str(data["name"]).strip()
        if not name or len(name) > 120:
            return jsonify({"error": "A valid patient name is required"}), 400
        updates["name"] = name

    if "age" in data:
        age = data["age"]
        if isinstance(age, bool) or not isinstance(age, int) or not 0 <= age <= 125:
            return jsonify({"error": "Age must be a whole number from 0 to 125"}), 400
        updates["age"] = age

    if "gender" in data:
        gender = str(data["gender"]).strip()
        if gender not in {"Male", "Female", "Other", "Prefer not to say"}:
            return jsonify({"error": "Select a valid gender option"}), 400
        updates["gender"] = gender

    if "phone" in data:
        phone = str(data["phone"]).strip()
        if len(phone) > 30:
            return jsonify({"error": "Phone number is too long"}), 400
        updates["phone"] = phone

    if "notes" in data or "medicalNotes" in data:
        notes = str(data.get("medicalNotes", data.get("notes", ""))).strip()
        if len(notes) > 2000:
            return jsonify({"error": "Medical notes are too long"}), 400
        updates["medicalNotes"] = notes

    if not updates:
        return jsonify({"error": "No editable fields provided"}), 400

    updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
    updates["updatedBy"] = user.get("uid")
    patient_ref.update(updates)

    return jsonify({
        "status": "updated",
        "patientId": patient_id
    }), 200


@patients_bp.route("/api/v1/patients/<patient_id>", methods=["DELETE"])
@require_auth
def delete_patient(patient_id):
    user, error = staff_user()
    if error:
        return error

    if user.get("role") != "admin":
        return jsonify({"error": "Only administrators can delete patients"}), 403

    patient_ref = db().child(f"patients/{patient_id}")
    existing = patient_ref.get()

    if existing is None:
        return jsonify({"error": "Patient not found"}), 404

    # Delete only the patient profile. Do not silently delete medical history,
    # vitals, or alerts, which may require a separate retention policy.
    patient_ref.delete()

    return jsonify({
        "status": "deleted",
        "patientId": patient_id
    }), 200
