
import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { fetchVitals } from "../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Demo-only fluctuation: changes display values without modifying source data.
function fluctuate(value, min, max) {
  if (value == null || !Number.isFinite(Number(value))) return null;

  const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
  return Math.max(min, Math.min(max, Number(value) + change));
}

export default function VitalsChart({ patientId }) {
  const [readings, setReadings] = useState({});
  const [demoReadings, setDemoReadings] = useState({});
  const [error, setError] = useState("");

  // Fetch actual readings from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadVitals() {
      try {
        const data = await fetchVitals(patientId);

        if (!cancelled) {
          setReadings(data || {});
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load vital readings.");
        }
      }
    }

    if (patientId) {
      loadVitals();
    } else {
      setReadings({});
    }

    const interval = setInterval(() => {
      if (patientId) loadVitals();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [patientId]);

  // Create separate display-only values that change every second.
  useEffect(() => {
    const updateDemoReadings = () => {
      setDemoReadings((previous) => {
        const next = {};

        Object.entries(readings || {}).forEach(([id, reading]) => {
          const oldDemo = previous[id];

          next[id] = {
            ...reading,
            heartRate: fluctuate(
              oldDemo?.heartRate ?? reading.heartRate,
              40,
              180
            ),
            spo2: fluctuate(
              oldDemo?.spo2 ?? reading.spo2,
              90,
              100
            ),
          };
        });

        return next;
      });
    };

    updateDemoReadings();
    const interval = setInterval(updateDemoReadings, 1000);

    return () => clearInterval(interval);
  }, [readings]);

  const entries = Object.values(demoReadings || {});

  const chartData = {
    labels: entries.map((r) =>
      new Date(r.timestamp || Date.now()).toLocaleTimeString()
    ),
    datasets: [
      {
        label: "Heart Rate (bpm) — DEMO",
        data: entries.map((r) => r.heartRate ?? null),
        borderColor: "#e74c3c",
        tension: 0.3,
      },
      {
        label: "SpO2 (%) — DEMO",
        data: entries.map((r) => r.spo2 ?? null),
        borderColor: "#3498db",
        tension: 0.3,
      },
    ],
  };

  return (
    <div>
      <h3>Vitals - {patientId || "No patient selected"}</h3>

      

      {error && <p role="alert">Unable to load vitals: {error}</p>}

      {!entries.length && !error && (
        <p>Waiting for vital readings...</p>
      )}

      {entries.length > 0 && (
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: true,
            animation: {
              duration: 300,
            },
            scales: {
              x: { type: "category" },
              y: { beginAtZero: false },
            },
          }}
        />
      )}
    </div>
  );
}
