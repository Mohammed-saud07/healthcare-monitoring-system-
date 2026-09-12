import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { fetchVitals } from "../services/api";

export default function VitalsChart({ patientId }) {
  const [readings, setReadings] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetchVitals(patientId).then((data) => {
      if (!cancelled) setReadings(data || {});
    });
    const interval = setInterval(() => {
      fetchVitals(patientId).then((data) => {
        if (!cancelled) setReadings(data || {});
      });
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [patientId]);

  const entries = Object.values(readings);
  const chartData = {
    labels: entries.map((r) => new Date(r.timestamp || Date.now()).toLocaleTimeString()),
    datasets: [
      {
        label: "Heart Rate (bpm)",
        data: entries.map((r) => r.heartRate),
        borderColor: "#e74c3c",
        tension: 0.3,
      },
      {
        label: "SpO2 (%)",
        data: entries.map((r) => r.spo2),
        borderColor: "#3498db",
        tension: 0.3,
      },
    ],
  };

  return (
    <div>
      <h3>Vitals - {patientId}</h3>
      <Line data={chartData} />
    </div>
  );
}
