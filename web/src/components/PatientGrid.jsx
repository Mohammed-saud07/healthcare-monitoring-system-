import React from "react";
import VitalsChart from "./VitalsChart";

// Replace with a real patient list pulled from your backend/Firestore
const DEMO_PATIENTS = ["P001"];

export default function PatientGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      {DEMO_PATIENTS.map((id) => (
        <VitalsChart key={id} patientId={id} />
      ))}
    </div>
  );
}
