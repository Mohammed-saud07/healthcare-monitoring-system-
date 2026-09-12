"""
Loads the trained models (produced by ml/train_*.py) and exposes a
single classify_reading() function the vitals route calls per request.

Copy anomaly_classifier.pkl / anomaly_classifier_features.pkl from the
ml/ folder into backend/app/models/ before this will run for real -
until then it falls back to a simple rule so the pipeline still works
end-to-end while you're training the model.
"""

import os
import joblib

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
_classifier = None
_feature_cols = None


def _load_model():
    global _classifier, _feature_cols
    if _classifier is not None:
        return
    model_path = os.path.join(_MODEL_DIR, "anomaly_classifier.pkl")
    features_path = os.path.join(_MODEL_DIR, "anomaly_classifier_features.pkl")
    if os.path.exists(model_path) and os.path.exists(features_path):
        _classifier = joblib.load(model_path)
        _feature_cols = joblib.load(features_path)


def _rule_based_fallback(reading: dict) -> str:
    """Used only until the trained model is dropped into app/models/."""
    hr = reading.get("heartRate", 0)
    spo2 = reading.get("spo2", 100)
    if reading.get("fall"):
        return "Critical"
    if spo2 and spo2 < 90:
        return "Critical"
    if hr and (hr > 130 or hr < 40):
        return "Critical"
    if spo2 and spo2 < 95:
        return "Moderate"
    if hr and (hr > 100 or hr < 50):
        return "Mild"
    return "Normal"


def classify_reading(reading: dict) -> str:
    _load_model()
    if _classifier is None:
        return _rule_based_fallback(reading)
    row = [[reading.get(col, 0) for col in _feature_cols]]
    return _classifier.predict(row)[0]
