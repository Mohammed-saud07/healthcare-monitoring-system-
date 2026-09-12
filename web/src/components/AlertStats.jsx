import React, { useEffect, useState } from "react";
import { fetchAlerts } from "../services/api";

export default function AlertStats({ patientId }) {
  const [alerts, setAlerts] = useState({});

  useEffect(() => {
    fetchAlerts(patientId).then(setAlerts).catch(console.error);
  }, [patientId]);

  const list = Object.entries(alerts || {});

  return (
    <div>
      <h3>Recent Alerts - {patientId}</h3>
      <ul>
        {list.map(([id, a]) => (
          <li key={id}>
            {new Date(a.sentAt).toLocaleString()} — {a.severity || "FALL"}
            {a.acknowledged ? " (acknowledged)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
