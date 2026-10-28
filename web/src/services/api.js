
const API_BASE =
  process.env.REACT_APP_API_BASE || "http://127.0.0.1:5000";

async function authHeaders() {
  const { auth } = await import("../src/firebase");
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in first.");
  }

  const tokenResult = await user.getIdTokenResult(true);

  console.log("Firebase auth diagnostic:", {
    uid: user.uid,
    email: user.email,
    patientId: tokenResult.claims.patientId ?? "MISSING",
    role: tokenResult.claims.role ?? "MISSING",
  });

  return {
    Authorization: `Bearer ${tokenResult.token}`,
  };
}

export async function fetchVitals(patientId) {
  const headers = await authHeaders();

  const res = await fetch(
    `${API_BASE}/api/v1/vitals?patientId=${encodeURIComponent(patientId)}`,
    { headers }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`fetchVitals failed: ${res.status} - ${errorText}`);
  }

  return res.json();
}

export async function fetchAlerts(patientId) {
  const headers = await authHeaders();

  const res = await fetch(
    `${API_BASE}/api/v1/alerts/${encodeURIComponent(patientId)}`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`fetchAlerts failed: ${res.status}`);
  }

  return res.json();
}

export async function verifyBackendAuth() {
  const headers = await authHeaders();

  const res = await fetch(`${API_BASE}/api/v1/auth/me`, { headers });

  if (!res.ok) {
    throw new Error(`Authentication verification failed: ${res.status}`);
  }

  return res.json();
}



export async function registerPatient(patient) {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE}/api/v1/patients`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patientId: patient.patientId.trim(),
      name: patient.name.trim(),
      age: Number(patient.age),
      gender: patient.gender,
      phone: patient.phone.trim(),
      notes: patient.notes.trim(),
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Patient registration failed (${response.status})`
    );
  }

  return result;
}


export async function acknowledgeAlert(patientId, alertId) {
  const headers = await authHeaders();

  const response = await fetch(
    `${API_BASE}/api/v1/alerts/${encodeURIComponent(patientId)}/acknowledge`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ alertId }),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Failed to acknowledge alert (${response.status})`
    );
  }

  return result;
}


export async function fetchPatients() {
  const headers = await authHeaders();

  const response = await fetch(`${API_BASE}/api/v1/patients`, {
    method: "GET",
    headers,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Unable to load patient records.");
  }

  return result;
}



export async function updatePatient(patientId, patient) {
  const headers = await authHeaders();

  const response = await fetch(
    `${API_BASE}/api/v1/patients/${encodeURIComponent(patientId)}`,
    {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patient),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Patient update failed (${response.status})`
    );
  }

  return result;
}

export async function deletePatient(patientId) {
  const headers = await authHeaders();

  const response = await fetch(
    `${API_BASE}/api/v1/patients/${encodeURIComponent(patientId)}`,
    {
      method: "DELETE",
      headers,
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Patient deletion failed (${response.status})`
    );
  }

  return result;
}


export async function fetchMessageHistory(patientId) {
  const headers = await authHeaders();

  const response = await fetch(
    `${API_BASE}/api/v1/alerts/${encodeURIComponent(patientId)}/messages`,
    { headers }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Failed to load message history (${response.status})`
    );
  }

  return result;
}

export async function sendCustomMessage(patientId, message, relatedAlertId) {
  const headers = await authHeaders();

  const response = await fetch(
    `${API_BASE}/api/v1/alerts/${encodeURIComponent(patientId)}/messages`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        ...(relatedAlertId ? { relatedAlertId } : {}),
      }),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Failed to send message (${response.status})`
    );
  }

  return result;
}
