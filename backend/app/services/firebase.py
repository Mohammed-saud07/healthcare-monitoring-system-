import os
import firebase_admin
from firebase_admin import credentials, db as rtdb, firestore

_initialized = False


def init_firebase():
    global _initialized
    if _initialized:
        return
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")
    database_url = os.getenv("FIREBASE_DATABASE_URL")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {"databaseURL": database_url})
    _initialized = True


def db():
    """Realtime Database root reference. Call init_firebase() once at startup first."""
    init_firebase()
    return rtdb.reference("/")


def firestore_db():
    init_firebase()
    return firestore.client()
