
import React, { useState } from "react";
import { registerPatient } from "../services/api";

const initialForm = {
  patientId: "P002",
  name: "",
  age: "",
  gender: "Male",
  phone: "",
  notes: "",
};

export default function RegisterPatient({ onRegistered }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.patientId.trim() ||
      !form.name.trim() ||
      !form.age ||
      !form.phone.trim()
    ) {
      setError("Please fill in Patient ID, name, age, and phone.");
      return;
    }

    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 0 || age > 130) {
      setError("Enter a valid age between 0 and 130.");
      return;
    }

    try {
      setLoading(true);
      const result = await registerPatient({ ...form, age });

      setSuccess(
        result.message || `Patient ${form.patientId.trim()} registered successfully.`
      );

      if (onRegistered) {
        await onRegistered(form.patientId.trim());
      }

      setForm({ ...initialForm, patientId: "" });
    } catch (err) {
      setError(err.message || "Could not register the patient.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    background: "white",
    color: "#111827",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 13,
    color: "#374151",
  };

  return (
    <section style={{
      maxWidth: 720,
      padding: 24,
      margin: "20px auto",
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    }}>
      <h2 style={{ marginTop: 0, color: "#111827" }}>
        Register Patient
      </h2>
      <p style={{ color: "#6b7280", fontSize: 14 }}>
        Enter patient details to add a record to CarePulse.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}>
          <div>
            <label style={labelStyle} htmlFor="patientId">Patient ID *</label>
            <input
              id="patientId"
              name="patientId"
              value={form.patientId}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="name">Full name *</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="age">Age *</label>
            <input
              id="age"
              name="age"
              type="number"
              min="0"
              max="130"
              value={form.age}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="gender">Gender *</label>
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              style={inputStyle}
              required
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={labelStyle} htmlFor="phone">Phone number *</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="notes">Medical notes</label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              value={form.notes}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: "#b91c1c", marginTop: 16 }}>
            {error}
          </p>
        )}

        {success && (
          <p role="status" style={{ color: "#047857", marginTop: 16 }}>
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 20,
            padding: "11px 20px",
            border: 0,
            borderRadius: 8,
            background: loading ? "#9ca3af" : "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Registering..." : "Register Patient"}
        </button>
      </form>
    </section>
  );
}
