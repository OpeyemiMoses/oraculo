import { useEffect, useState } from "react";

const MAINNET_DATE = new Date("2026-06-11T00:00:00Z");

function getTimeLeft() {
  const diff = MAINNET_DATE.getTime() - Date.now();
  if (diff <= 0) return null;
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

export default function MainnetCountdown() {
  const [time, setTime] = useState(getTimeLeft());

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  const pad = n => String(n).padStart(2, "0");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 40, textAlign: "center" }}>

      {/* Maintenance icon */}
      <div style={{ fontSize: 72, marginBottom: 24, animation: "spin 6s linear infinite", display: "inline-block" }}>⚙️</div>

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--silver)", letterSpacing: "0.08em", marginBottom: 8 }}>
        MAINNET NOT AVAILABLE YET
      </h2>
      <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 36, letterSpacing: "0.06em" }}>
        Switch to Testnet to explore and place simulated bets
      </p>

      {/* Countdown */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
        {[
          { value: time.days,    label: "D" },
          { value: time.hours,   label: "HRS" },
          { value: time.minutes, label: "MIN" },
          { value: time.seconds, label: "SEC" },
        ].map((unit, i) => (
          <div key={unit.label} style={{ display: "flex", alignItems: "center", gap: i < 3 ? 16 : 0 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 52, color: "var(--silver)",
                letterSpacing: "0.04em", lineHeight: 1,
                background: "var(--bg3)", border: "1px solid var(--border2)",
                borderRadius: 12, padding: "12px 20px", minWidth: 80,
              }}>
                {unit.label === "D" ? time.days : pad(unit.value)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6, letterSpacing: "0.1em" }}>{unit.label}</div>
            </div>
            {i < 3 && <span style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--border2)", marginTop: -16 }}>:</span>}
          </div>
        ))}
      </div>

      <p style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#f59e0b", letterSpacing: "0.06em" }}>
        {time.days}D : {pad(time.hours)}HRS : {pad(time.seconds)}SECS to Mainnet
      </p>
      <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8, letterSpacing: "0.04em" }}>
        Mainnet will be live when the World Cup Starts
      </p>
    </div>
  );
}