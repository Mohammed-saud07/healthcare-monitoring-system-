
import React, { useCallback, useEffect, useState } from "react";
import {
  fetchAlerts,
  acknowledgeAlert,
} from "../services/api";

function formatDate(value) {
  if (value === undefined || value === null || value === "") {
    return "Timestamp unavailable";
  }

  // Support Firebase timestamps in milliseconds and date strings.
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Invalid timestamp"
    : date.toLocaleString();
}

function getReading(alert, keys, unit = "") {
  for (const key of keys) {
    const value = alert?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return `${value}${unit}`;
    }
  }

  return "Not recorded";
}

// Categorize alerts for the summary counts and severity filter.
function alertCategory(alert) {
  const severity = String(alert?.severity || "").toUpperCase();

  if (
    severity === "CRITICAL" ||
    severity === "EMERGENCY" ||
    severity === "FALL"
  ) {
    return "CRITICAL";
  }

  if (severity === "HIGH") {
    return "HIGH";
  }

  return "INFO";
}

export default function AlertStats({ patientId }) {
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [alerts, setAlerts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  // Fetch alerts from the Flask backend.
  const loadAlerts = useCallback(async () => {
    try {
      setError("");

      const data = await fetchAlerts(patientId);

      setAlerts(
        data && typeof data === "object" && !Array.isArray(data)
          ? data
          : {}
      );
    } catch (err) {
      setError(err.message || "Unable to load alerts.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Initial load and automatic refresh every 10 seconds.
  useEffect(() => {
    setLoading(true);
    loadAlerts();

    const timer = setInterval(loadAlerts, 10000);

    return () => clearInterval(timer);
  }, [loadAlerts]);

  // Acknowledge an alert through the backend.
  async function handleAcknowledge(alertId) {
    try {
      setBusyId(alertId);
      setError("");

      await acknowledgeAlert(patientId, alertId);

      setAlerts((previous) => ({
        ...previous,
        [alertId]: {
          ...previous[alertId],
          acknowledged: true,
        },
      }));
    } catch (err) {
      setError(err.message || "Unable to acknowledge alert.");
    } finally {
      setBusyId("");
    }
  }

  // Sort alerts from newest to oldest.
  const list = Object.entries(alerts).sort(
    ([, alertA], [, alertB]) => {
      const timeA = new Date(
        alertA?.sentAt ??
          alertA?.timestamp ??
          alertA?.createdAt ??
          0
      ).getTime();

      const timeB = new Date(
        alertB?.sentAt ??
          alertB?.timestamp ??
          alertB?.createdAt ??
          0
      ).getTime();

      return (
        (Number.isFinite(timeB) ? timeB : 0) -
        (Number.isFinite(timeA) ? timeA : 0)
      );
    }
  );

  // Summary counts use all loaded alerts, regardless of active filters.
  const criticalCount = list.filter(
    ([, alert]) => alertCategory(alert) === "CRITICAL"
  ).length;

  const highCount = list.filter(
    ([, alert]) => alertCategory(alert) === "HIGH"
  ).length;

  const infoCount = list.filter(
    ([, alert]) => alertCategory(alert) === "INFO"
  ).length;

  const unacknowledged = list.filter(
    ([, alert]) => !alert?.acknowledged
  ).length;

  // Filter by severity and searchable alert details.
  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredList = list.filter(([id, alert]) => {
    const matchesSeverity =
      severityFilter === "ALL" ||
      alertCategory(alert) === severityFilter;

    const haystack = [
      id,
      alert?.patientId,
      patientId,
      alert?.severity,
      alert?.reason,
      alert?.message,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = haystack.includes(normalizedSearch);

    return matchesSeverity && matchesSearch;
  });

  return (
    <section className="alert-stats">
      {/* Header */}
      <div className="alert-stats-header">
        <div>
          <h3>Emergency Alert History</h3>
          <p>Patient ID: {patientId}</p>
        </div>

        <button
          type="button"
          onClick={loadAlerts}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Alert summary */}
      <div className="alert-summary">
        <span>Total alerts: {list.length}</span>
        <span>Critical: {criticalCount}</span>
        <span>High: {highCount}</span>
        <span>Info: {infoCount}</span>
        <span>Awaiting acknowledgement: {unacknowledged}</span>
      </div>

      {/* Severity filter and search */}
      <div className="alert-filters">
        <div className="alert-filter-group">
          <label htmlFor="alert-severity-filter">
            Filter by severity
          </label>

          <select
            id="alert-severity-filter"
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(event.target.value)
            }
          >
            <option value="ALL">All alerts</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="INFO">Info</option>
          </select>
        </div>

        <div className="alert-filter-group">
          <label htmlFor="alert-search">
            Search alerts
          </label>

          <input
            id="alert-search"
            type="search"
            placeholder="Search ID, patient, severity or reason..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </div>

      {/* Error feedback */}
      {error && (
        <p role="alert" className="alert-error">
          {error}
        </p>
      )}

      {/* Alert list */}
      {loading ? (
        <p>Loading alerts...</p>
      ) : list.length === 0 ? (
        <p>No recorded alerts found for this patient.</p>
      ) : filteredList.length === 0 ? (
        <p>No alerts match your search or severity filter.</p>
      ) : (
        <div className="alert-list">
          {filteredList.map(([id, alert]) => {
            const severity = String(
              alert?.severity || "ALERT"
            ).toUpperCase();

            const category = alertCategory(alert);
            const acknowledged = Boolean(alert?.acknowledged);

            // Support both new and existing Telegram status fields.
            const telegramStatus =
              alert?.telegramStatus ??
              alert?.telegram?.status ??
              alert?.notificationStatus?.find(
                (item) =>
                  String(item?.channel || "").toLowerCase() ===
                  "telegram"
              )?.status ??
              (typeof alert?.telegramSent === "boolean"
                ? alert.telegramSent
                  ? "Sent"
                  : "Failed"
                : "Status not recorded");

            return (
              <article
                key={id}
                className={`alert-card ${
                  category === "CRITICAL" ? "critical" : "standard"
                }`}
              >
                {/* Alert heading */}
                <div className="alert-card-heading">
                  <div>
                    <strong>{severity}</strong>

                    <p>
                      {alert?.reason ||
                        alert?.message ||
                        "Reason not recorded"}
                    </p>
                  </div>

                  <span>
                    {acknowledged
                      ? "Acknowledged"
                      : "Needs review"}
                  </span>
                </div>

                {/* Alert metadata */}
                <p>
                  <strong>Alert ID:</strong> {id}
                </p>

                <p>
                  <strong>Patient ID:</strong>{" "}
                  {alert?.patientId || patientId}
                </p>

                <p>
                  <strong>Time:</strong>{" "}
                  {formatDate(
                    alert?.sentAt ??
                      alert?.timestamp ??
                      alert?.createdAt
                  )}
                </p>

                {/* Recorded readings */}
                <div className="alert-readings">
                  <p>
                    <strong>Heart rate:</strong>{" "}
                    {getReading(
                      alert,
                      ["heartRate", "heart_rate", "hr"],
                      " bpm"
                    )}
                  </p>

                  <p>
                    <strong>SpO₂:</strong>{" "}
                    {getReading(
                      alert,
                      ["spo2", "SpO2", "oxygenSaturation"],
                      "%"
                    )}
                  </p>

                  <p>
                    <strong>Temperature:</strong>{" "}
                    {getReading(
                      alert,
                      ["temperature", "temp"],
                      "°C"
                    )}
                  </p>

                  <p>
                    <strong>Fall detected:</strong>{" "}
                    {getReading(
                      alert,
                      ["fallDetected", "fall_detected", "fall"]
                    )}
                  </p>
                </div>

                {/* Telegram notification status */}
                <p>
                  <strong>Telegram:</strong> {String(telegramStatus)}
                </p>

                {/* Acknowledge action */}
                {!acknowledged && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(id)}
                    disabled={busyId === id}
                  >
                    {busyId === id
                      ? "Acknowledging..."
                      : "Acknowledge alert"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
