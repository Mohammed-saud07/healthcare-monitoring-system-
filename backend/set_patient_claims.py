
import os
import firebase_admin
from firebase_admin import credentials, auth

cred_path = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_PATH",
    "./firebase-service-account.json"
)

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

uid = input("Enter your Firebase user's UID: ").strip()

if not uid:
    raise SystemExit("UID cannot be empty.")

user = auth.get_user(uid)

claims = user.custom_claims or {}

# Preserve existing claims and grant administrator access.
claims["role"] = "admin"

auth.set_custom_user_claims(uid, claims)

updated_user = auth.get_user(uid)

print("Custom claims updated successfully.")
print("Email:", updated_user.email)
print("Claims:", updated_user.custom_claims)
print("Sign out and sign back in to refresh your ID token.")
