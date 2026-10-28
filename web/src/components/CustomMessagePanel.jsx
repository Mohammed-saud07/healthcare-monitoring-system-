
import React, { useCallback, useEffect, useState } from "react";
import {
  fetchPatients,
  fetchMessageHistory,
  sendCustomMessage,
} from "../services/api";

function formatTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid timestamp"
    : date.toLocaleString();
}

export default function CustomMessagePanel() {
  const [patients, setPatients] = useState({});
  const [patientId, setPatientId] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState({});
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPatients = useCallback(async () => {
    try {
      setError("");
      const data = await fetchPatients();
      const safePatients =
        data && typeof data === "object" ? data : {};

      setPatients(safePatients);

      setPatientId((current) => {
        if (current && safePatients[current]) return current;
        return Object.keys(safePatients)[0] || "";
      });
    } catch (err) {
      setError(err.message || "Unable to load patients.");
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!patientId) {
      setHistory({});
      return;
    }

    try {
      setLoadingHistory(true);
      const data = await fetchMessageHistory(patientId);
      setHistory(data && typeof data === "object" ? data : {});
    } catch (err) {
      setError(err.message || "Unable to load message history.");
    } finally {
      setLoadingHistory(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleSend(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const trimmed = message.trim();

    if (!patientId) {
      setError("Select a patient first.");
      return;
    }

    if (!trimmed || trimmed.length > 3000) {
      setError("Message must contain 1 to 3000 characters.");
      return;
    }

    const patientName = patients[patientId]?.name || patientId;
    const confirmed = window.confirm(
      `Send this Telegram message for ${patientName} (${patientId})?\n\n${trimmed}`
    );

    if (!confirmed) return;

    try {
      setSending(true);
      const result = await sendCustomMessage(patientId, trimmed);

      if (result.status === "sent") {
        setNotice("Telegram accepted the message successfully.");
        setMessage("");
      } else {
        setNotice(`Message status: ${result.status}`);
      }

      await loadHistory();
    } catch (err) {
      setError(err.message || "Unable to send the message.");
      // Refresh history even if the request returned an error.
      await loadHistory();
    } finally {
      setSending(false);
    }
  }

  const historyItems = Object.entries(history).sort(
    ([, a], [, b]) =>
      new Date(b?.createdAt || 0).getTime() -
      new Date(a?.createdAt || 0).getTime()
  );

  return (
    <section className="panel custom-message-panel">
      <div className="panel-heading">
        <div>
          <h3>Custom Telegram messages</h3>
          <p>Compose a message and review previous attempts.</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            loadPatients();
            loadHistory();
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="alert-error" role="alert">{error}</p>
      )}
      {notice && (
        <p className="message-success" role="status">{notice}</p>
      )}

      <form onSubmit={handleSend} className="custom-message-form">
        <label htmlFor="message-patient">Registered patient</label>
        <select
          id="message-patient"
          value={patientId}
          onChange={(event) => setPatientId(event.target.value)}
          disabled={loadingPatients || sending}
          required
        >
          <option value="">
            {loadingPatients ? "Loading patients..." : "Select a patient"}
          </option>
          {Object.entries(patients).map(([id, patient]) => (
            <option key={id} value={id}>
              {(patient.name || id) + ` (${id})`}
            </option>
          ))}
        </select>

        <label htmlFor="custom-message">Message</label>
        <textarea
          id="custom-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={3000}
          rows={5}
          placeholder="Write your message..."
          required
        />

        <p className="field-hint">
          {message.length}/3000 characters. The message will go to the
          configured Telegram chat.
        </p>

        <div className="message-preview">
          <strong>Preview</strong>
          <p>💬 CarePulse message</p>
          <p>
            Patient: {patients[patientId]?.name || patientId || "Not selected"}
            {patientId ? ` (${patientId})` : ""}
          </p>
          <p>{message.trim() || "Your message will appear here."}</p>
        </div>

        <button
          className="primary-button"
          type="submit"
          disabled={sending || loadingPatients || !patientId || !message.trim()}
        >
          {sending ? "Sending..." : "Preview and send"}
        </button>
      </form>

      <div className="message-history">
        <div className="panel-heading">
          <div>
            <h4>Message history</h4>
            <p>{patientId ? `Patient ${patientId}` : "Select a patient"}</p>
          </div>
        </div>

        {loadingHistory ? (
          <p>Loading history...</p>
        ) : historyItems.length === 0 ? (
          <p>No messages recorded for this patient.</p>
        ) : (
          <div className="alert-list">
            {historyItems.map(([id, item]) => (
              <article className="alert-card standard" key={id}>
                <div className="alert-card-heading">
                  <strong>{item.status || "unknown"}</strong>
                  <span>{formatTime(item.createdAt)}</span>
                </div>
                <p>{item.message}</p>
                <p>
                  <strong>Sender role:</strong> {item.senderRole || "unknown"}
                </p>
                <p>
                  <strong>Recipient:</strong>{" "}
                  {item.recipient || "Configured Telegram chat"}
                </p>
                {item.error && (
                  <p className="alert-error">{item.error}</p>
                )}
                {item.relatedAlertId && (
                  <p>
                    <strong>Related alert:</strong> {item.relatedAlertId}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
