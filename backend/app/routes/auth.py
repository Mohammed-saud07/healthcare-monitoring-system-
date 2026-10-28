
from functools import wraps

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth

auth_bp = Blueprint("auth", __name__)


def require_patient_access(patient_id):
    """Allow patients to access their own data and authorized staff
    to access patients within their permissions.
    """
    user = getattr(request, "firebase_user", None)

    if not user:
        return jsonify({"error": "Authentication required"}), 401

    role = user.get("role")

    # Patients can access only their own records.
    if role == "patient":
        if user.get("patientId") == patient_id:
            return None
        return jsonify({"error": "Access denied for this patient"}), 403

    # Admins can manage all patient records.
    if role == "admin":
        return None

    # Clinicians and caregivers can access only assigned patients.
    if role in {"doctor", "caregiver"}:
        assigned = user.get("patientIds", [])
        if isinstance(assigned, list) and patient_id in assigned:
            return None

    return jsonify({"error": "Access denied for this patient"}), 403


def require_auth(view_func):
    """Verify a Firebase ID token sent as a Bearer token."""

    @wraps(view_func)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")

        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing Firebase ID token"}), 401

        token = header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({"error": "Missing Firebase ID token"}), 401

        try:
            decoded_token = firebase_auth.verify_id_token(token)
        except Exception as exc:
            print(
                "Firebase token verification failed:",
                type(exc).__name__,
                str(exc),
            )
            return jsonify({
                "error": "Invalid or expired Firebase ID token"
            }), 401

        print(
            "Verified Firebase claims:",
            {
                "uid": decoded_token.get("uid"),
                "patientId": decoded_token.get("patientId"),
                "role": decoded_token.get("role"),
            },
        )

        request.firebase_user = decoded_token
        return view_func(*args, **kwargs)

    return wrapped


@auth_bp.route("/api/v1/auth/me", methods=["GET"])
@require_auth
def current_user():
    """Return the identity associated with the verified Firebase token."""

    user = request.firebase_user

    return jsonify({
        "uid": user.get("uid"),
        "email": user.get("email"),
        "email_verified": user.get("email_verified", False),
    }), 200
