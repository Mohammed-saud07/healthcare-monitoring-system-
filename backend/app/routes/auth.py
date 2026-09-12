import os
import datetime
import jwt
from flask import Blueprint, request, jsonify

auth_bp = Blueprint("auth", __name__)

# Demo-only user store. Replace with a real Firestore/DB-backed user lookup
# before this goes anywhere near production.
_DEMO_USERS = {
    "demo@example.com": "demo-password"
}


@auth_bp.route("/api/v1/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    email = data.get("email")
    password = data.get("password")

    if _DEMO_USERS.get(email) != password:
        return jsonify({"error": "invalid credentials"}), 401

    secret = os.getenv("JWT_SECRET_KEY", "change-me")
    payload = {
        "sub": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12),
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    return jsonify({"token": token})


def require_auth(view_func):
    """Decorator: use on any route that needs a valid Bearer token."""
    from functools import wraps

    @wraps(view_func)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "missing token"}), 401
        token = header.split(" ", 1)[1]
        secret = os.getenv("JWT_SECRET_KEY", "change-me")
        try:
            jwt.decode(token, secret, algorithms=["HS256"])
        except jwt.PyJWTError:
            return jsonify({"error": "invalid or expired token"}), 401
        return view_func(*args, **kwargs)

    return wrapped
