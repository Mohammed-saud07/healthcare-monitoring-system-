
import os
import firebase_admin
from firebase_admin import auth

# Reuse the backend's Firebase Admin initialization.
from app.services.firebase import init_firebase

init_firebase()

uid = "mkTbfWjbGzey7xoSIlMFjQWJYFi1"

user = auth.get_user(uid)
claims = user.custom_claims or {}

claims["role"] = "admin"

auth.set_custom_user_claims(uid, claims)

print(f"Admin role assigned to {user.email}")
print("Sign out and sign back in to refresh your claims.")
