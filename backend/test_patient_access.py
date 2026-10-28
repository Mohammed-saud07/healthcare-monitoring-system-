
from app import create_app
from app.routes.auth import require_patient_access
from flask import request

app = create_app()

with app.test_request_context("/api/v1/vitals?patientId=P001"):
    test_cases = [
        (
            "Admin can access P001",
            {"uid": "admin-test", "role": "admin"},
            "P001",
            True,
        ),
        (
            "Patient can access own P001",
            {"uid": "patient-test", "role": "patient", "patientId": "P001"},
            "P001",
            True,
        ),
        (
            "Patient cannot access P002",
            {"uid": "patient-test", "role": "patient", "patientId": "P001"},
            "P002",
            False,
        ),
    ]

    for label, claims, patient_id, should_allow in test_cases:
        request.firebase_user = claims
        result = require_patient_access(patient_id)
        passed = (result is None) == should_allow
        print(f'{"PASS" if passed else "FAIL"}: {label}')
        if not passed:
            print("  Result:", result)
