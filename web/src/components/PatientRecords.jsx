
import React, { useEffect, useState } from "react";
import { fetchPatients } from "../services/api";

export default function PatientRecords() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadPatients() {
    try {
      setLoading(true);
      setError("");

      const data = await fetchPatients();

      const records = Object.entries(data || {}).map(([id, patient]) => ({
      ...patient,
      patientId: patient.patientId || id,
      notes: patient.medicalNotes || patient.notes || "",
      }));

      setPatients(records);

    } catch (err) {
      setError(err.message || "Unable to load patient records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  async function savePatient(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      // Connect this to the authorized Flask API before enabling saves.
      const { updatePatient } = await import("../services/api");
      await updatePatient(editing.patientId, {
        name: editing.name,
        age: Number(editing.age),
        gender: editing.gender,
        phone: editing.phone,
        notes: editing.notes || "",
      });

      setEditing(null);
      await loadPatients();
    } catch (err) {
      setError(err.message || "Unable to update patient.");
    } finally {
      setSaving(false);
    }
  }

  async function removePatient(patient) {
    if (
      !window.confirm(
        `Delete patient ${patient.patientId} (${patient.name || "Unknown"})?`
      )
    ) return;

    setError("");

    try {
      // Connect this to the authorized Flask API before enabling deletion.
      const { deletePatient } = await import("../services/api");
      await deletePatient(patient.patientId);

      if (selected?.patientId === patient.patientId) setSelected(null);
      await loadPatients();
    } catch (err) {
      setError(err.message || "Unable to delete patient.");
    }
  }

  if (loading) return <p>Loading patient records...</p>;

  return (
    <section className="panel" style={{ padding: 24 }}>
      <h2>Patient Records</h2>
      <p>Registered patient details</p>

      {error && <p role="alert">{error}</p>}

      <p><strong>Total registered patients: {patients.length}</strong></p>

      <button type="button" onClick={loadPatients}>
        Refresh records
      </button>

      {patients.length === 0 ? (
        <p>No registered patients found.</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                {["Patient ID", "Name", "Age", "Gender", "Phone", "Actions"].map((heading) => (
                  <th key={heading} style={{ padding: 12, borderBottom: "1px solid #ddd" }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.patientId}>
                  <td style={{ padding: 12 }}>{patient.patientId}</td>
                  <td style={{ padding: 12 }}>{patient.name || "--"}</td>
                  <td style={{ padding: 12 }}>{patient.age ?? "--"}</td>
                  <td style={{ padding: 12 }}>{patient.gender || "--"}</td>
                  <td style={{ padding: 12 }}>{patient.phone || "--"}</td>
                  <td style={{ padding: 12 }}>
                    <button type="button" onClick={() => setSelected(patient)}>
                      View
                    </button>{" "}
                    <button type="button" onClick={() => setEditing({ ...patient })}>
                      Edit
                    </button>{" "}
                    <button type="button" onClick={() => removePatient(patient)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div role="dialog" aria-modal="true" style={{ marginTop: 24, padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3>{selected.name || "Patient details"}</h3>
          <p><strong>Patient ID:</strong> {selected.patientId}</p>
          <p><strong>Age:</strong> {selected.age ?? "--"}</p>
          <p><strong>Gender:</strong> {selected.gender || "--"}</p>
          <p><strong>Phone:</strong> {selected.phone || "--"}</p>
          <p>
          <strong>Medical notes:</strong>
          {" "}{selected.medicalNotes || selected.notes || "No notes provided"}
          </p>
          <button type="button" onClick={() => setSelected(null)}>Close</button>
        </div>
      )}

      {editing && (
        <form onSubmit={savePatient} style={{ marginTop: 24, padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3>Edit patient: {editing.patientId}</h3>

          <label>Name</label>
          <input required value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />

          <br /><br />
          <label>Age</label>
          <input required type="number" min="0" max="130" value={editing.age ?? ""} onChange={(e) => setEditing({ ...editing, age: e.target.value })} />

          <br /><br />
          <label>Gender</label>
          <input value={editing.gender || ""} onChange={(e) => setEditing({ ...editing, gender: e.target.value })} />

          <br /><br />
          <label>Phone</label>
          <input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />

          <br /><br />
          <label>Notes</label>
          <textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />

          <br /><br />
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>{" "}
          <button type="button" onClick={() => setEditing(null)}>Cancel</button>
        </form>
      )}
    </section>
  );
}
