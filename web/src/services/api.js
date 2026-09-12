const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchVitals(patientId) {
  const res = await fetch(`${API_BASE}/api/v1/vitals?patientId=${patientId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`fetchVitals failed: ${res.status}`);
  return res.json();
}

export async function fetchAlerts(patientId) {
  const res = await fetch(`${API_BASE}/api/v1/alerts/${patientId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`fetchAlerts failed: ${res.status}`);
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("login failed");
  const { token } = await res.json();
  localStorage.setItem("token", token);
  return token;
}
