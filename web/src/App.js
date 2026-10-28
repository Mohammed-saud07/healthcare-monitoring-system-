
import React, { useEffect, useState } from "react";
import CustomMessagePanel from "./components/CustomMessagePanel";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./src/firebase";
import { fetchVitals } from "./services/api";
import VitalsChart from "./components/VitalsChart";
import AlertStats from "./components/AlertStats";
import "./App.css";
import RegisterPatient from "./components/RegisterPatient";
import PatientRecords from "./components/PatientRecords";

const PATIENT_ID = "P001";

function MetricCard({ title, value, unit, icon, status, color }) {
  return (
    <article className={`metric-card ${color}`}>
      <div className="metric-top">
        <span className="metric-label">{title}</span>
        <span className="metric-icon">{icon}</span>
      </div>

      <div className="metric-value">
        {value ?? "--"} <span>{unit}</span>
      </div>

      <div className="metric-bottom">
        <span className="status-dot" />
        <span>{status}</span>
      </div>
    </article>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(
        err.code === "auth/invalid-credential"
          ? "Incorrect email or password."
          : err.message || "Unable to sign in."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">✚</div>
        <p className="eyebrow">HEALTHCARE MONITORING SYSTEM</p>
        <h1>Welcome back</h1>

        <p className="login-description">
          Sign in to access your patient monitoring dashboard.
        </p>

        <form onSubmit={submit} className="login-form">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button login-button" disabled={busy}>
            {busy ? "Signing in..." : "Sign in to dashboard"}
          </button>
        </form>

        <p className="login-footnote">
          Secure access for authorized users
        </p>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [vitals, setVitals] = useState(null);
  const [displayVitals, setDisplayVitals] = useState(null);
  const [apiError, setApiError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [loggingOut, setLoggingOut] = useState(false);

  // Listen for authentication changes.
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Fetch the actual latest reading every five seconds.
  useEffect(() => {
    if (!user) {
      setVitals(null);
      setDisplayVitals(null);
      return undefined;
    }

    let cancelled = false;

    async function loadVitals() {
      try {
        const data = await fetchVitals(PATIENT_ID);

        if (cancelled) return;

        const records = Object.values(data || {});

        const latest = records.length
          ? records.reduce((a, b) => {
              const ta = a.timestamp
                ? new Date(a.timestamp).getTime()
                : 0;
              const tb = b.timestamp
                ? new Date(b.timestamp).getTime()
                : 0;

              return tb >= ta ? b : a;
            })
          : null;

        setVitals(latest);
        setLastUpdated(new Date());
        setApiError("");
      } catch (err) {
        if (!cancelled) {
          setApiError(
            err.message || "Unable to connect to the backend."
          );
        }
      }
    }

    loadVitals();
    const timer = setInterval(loadVitals, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  // Display-only demonstration fluctuations.
  // Never send these generated values to Firebase or the backend.
  useEffect(() => {
    if (!user || !vitals) {
      setDisplayVitals(null);
      return undefined;
    }

    // Start with the latest real reading when it changes.
    setDisplayVitals({ ...vitals });

    const timer = setInterval(() => {
      setDisplayVitals((previous) => {
        if (!previous) return { ...vitals };

        function fluctuate(value, min, max, step = 1) {
          if (value == null || !Number.isFinite(Number(value))) {
            return value;
          }

          const change = Math.floor(Math.random() * 3) - 1;
          const next = Number(value) + change * step;

          return Math.max(min, Math.min(max, next));
        }

        return {
          ...previous,
          heartRate: fluctuate(previous.heartRate, 40, 180, 1),
          spo2: fluctuate(previous.spo2, 90, 100, 1),
          temperature: fluctuate(
            previous.temperature,
            35,
            42,
            0.1
          ),
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user, vitals]);

  // All hooks are above the conditional returns.
  if (user === undefined) {
    return (
      <main className="loading-screen">
        Loading your secure workspace...
      </main>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onLogin={(email, password) =>
          signInWithEmailAndPassword(auth, email, password)
        }
      />
    );
  }

  // Use the simulated values only for dashboard display.
  const heartRate = displayVitals?.heartRate ?? vitals?.heartRate;
  const spo2 = displayVitals?.spo2 ?? vitals?.spo2;
  const temperature =
    displayVitals?.temperature ?? vitals?.temperature;

  // Fall detection remains based on the actual backend reading.
  const fall = vitals?.fall;

  const navigation = [
    { name: "Dashboard", icon: "▦" },
    { name: "Patients", icon: "♙" },
    { name: "Patient Records", icon: "▣" },
    { name: "Alerts", icon: "♧" },
    { name: "History & Reports", icon: "▤" },
  ];

  function navigate(name) {
    setActivePage(name);

    if (name === "Alerts") {
      document.getElementById("alerts-section")?.scrollIntoView({
        behavior: "smooth",
      });
    } else if (name === "Dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">✚</div>
          <div>
            <strong>CarePulse</strong>
            <span>Patient monitoring</span>
          </div>
        </div>

        <div className="nav-heading">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => navigate(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>

              {item.name === "Alerts" && fall === true && (
                <span className="nav-alert-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-note">
            <span className="security-icon">✓</span>
            <div>
              <strong>Protected workspace</strong>
              <span>Signed-in session</span>
            </div>
          </div>

          <button
            className="logout-button"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              try {
                await signOut(auth);
              } finally {
                setLoggingOut(false);
              }
            }}
          >
            ↪ {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="user-area">
            <div className="connection-indicator">
              <span className={`status-dot ${apiError ? "warning" : ""}`} />
              {apiError ? "Backend unavailable" : "Backend connected"}
            </div>

            <div className="avatar">
              {(user.email || "U").charAt(0).toUpperCase()}
            </div>

            <div className="user-details">
              <strong>Signed-in user</strong>
              <span>{user.email}</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">PATIENT CARE OVERVIEW</p>
              <h1>Healthcare dashboard</h1>
              <p className="page-description">
                Monitor patient vitals and review important events.
              </p>
            </div>

            <div className="update-chip">
              <span className="status-dot" />
              {lastUpdated
                ? `Last checked ${lastUpdated.toLocaleTimeString()}`
                : "Waiting for data"}
            </div>
          </section>

          {apiError && (
            <div className="notice notice-warning" role="status">
              <strong>Backend connection issue</strong>
              <span>
                {apiError}. Check that Flask is running on port 5000.
              </span>
            </div>
          )}

          {activePage === "Alerts" && (
          <>
          <AlertStats patientId={PATIENT_ID} />
          <CustomMessagePanel />
          </>
          )}

          {activePage === "Patients" && <RegisterPatient />}

          {activePage === "Patient Records" && <PatientRecords />}

          {activePage === "History & Reports" && (
            <div className="notice">
              <strong>History &amp; Reports</strong>
              <span>This section is coming soon.</span>
            </div>
          )}

          <section className="section-heading">
            <div>
              <h2>Patient overview</h2>
              <p>Current readings for patient {PATIENT_ID}</p>
            </div>
            <span className="patient-id">ID: {PATIENT_ID}</span>
          </section>

          <section
            className="metrics-grid"
            aria-label="Current vital readings"
          >
            <MetricCard
              title="Heart rate"
              value={heartRate}
              unit="bpm"
              icon="♡"
              status={
                heartRate == null ? "No reading" : "Latest reading"
              }
              color="coral"
            />

            <MetricCard
              title="Blood oxygen"
              value={spo2}
              unit="%"
              icon="◉"
              status={spo2 == null ? "No reading" : "Latest reading"}
              color="blue"
            />

            <MetricCard
              title="Body temperature"
              value={
                temperature == null
                  ? "--"
                  : Number(temperature).toFixed(1)
              }
              unit="°C"
              icon="♨"
              status={
                temperature == null ? "No reading" : "Latest reading"
              }
              color="amber"
            />

            <MetricCard
              title="Fall detection"
              value={fall == null ? "--" : fall ? "Detected" : "None"}
              unit=""
              icon="⌁"
              status={
                fall == null
                  ? "No reading"
                  : fall
                    ? "Review alert"
                    : "No fall reported"
              }
              color={fall ? "coral" : "green"}
            />
          </section>

          <section className="section-heading chart-heading">
            <div>
              <h2>Vital signs &amp; trends</h2>
              <p>Readings returned by your monitoring API</p>
            </div>

            <span className="live-chip">
              <span className="status-dot" /> Auto-refresh · 5 sec
            </span>
          </section>

          <section className="charts-grid">
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Vital trends</h3>
                  <p>Heart rate and oxygen saturation</p>
                </div>
                <span className="panel-symbol">⌁</span>
              </div>

              <VitalsChart patientId={PATIENT_ID} />
            </div>

            <div className="panel patient-panel">
              <div className="panel-heading">
                <div>
                  <h3>Patient summary</h3>
                  <p>Monitoring profile</p>
                </div>
                <span className="panel-symbol">♙</span>
              </div>

              <div className="patient-profile">
                <div className="patient-avatar">P</div>
                <div>
                  <strong>Patient {PATIENT_ID}</strong>
                  <span>Monitoring record</span>
                </div>
              </div>

              <div className="summary-row">
                <span>Heart rate</span>
                <strong>
                  {heartRate == null ? "--" : `${heartRate} bpm`}
                </strong>
              </div>

              <div className="summary-row">
                <span>SpO₂</span>
                <strong>
                  {spo2 == null ? "--" : `${spo2}%`}
                </strong>
              </div>

              <div className="summary-row">
                <span>Temperature</span>
                <strong>
                  {temperature == null
                    ? "--"
                    : `${Number(temperature).toFixed(1)} °C`}
                </strong>
              </div>

              <div className="summary-row">
                <span>Fall event</span>
                <strong>
                  {fall == null
                    ? "Unknown"
                    : fall
                      ? "Reported"
                      : "Not reported"}
                </strong>
              </div>

              <p className="data-disclaimer">
                Values reflect the latest API response and are not a
                medical diagnosis.
              </p>
            </div>
          </section>

          <section id="alerts-section" className="panel alerts-panel">
            <div className="panel-heading">
              <div>
                <h3>Recent alerts</h3>
                <p>Review recorded monitoring events</p>
              </div>

              <button
                className="secondary-button"
                onClick={() => setActivePage("Alerts")}
              >
                View alerts →
              </button>
            </div>

            <AlertStats patientId={PATIENT_ID} />
          </section>

          <footer className="page-footer">
            <span>CarePulse · Healthcare Monitoring System</span>
            <span>
              Final-year project · Use authorized test data for demonstrations
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
