import { useEffect, useState } from "react";
import { API_URL } from "../config.js";
import MarketCard from "../components/MarketCard.jsx";
import { getMarketDisplay, getMarketPool } from "../utils/marketStatus.js";

export default function Leaderboard() {
  const [markets, setMarkets] = useState([]);
  const [filter, setFilter] = useState("Live");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/markets`)
      .then(r => r.json())
      .then(d => setMarkets(d.markets || []))
      .finally(() => setLoading(false));
  }, []);

  const filters = ["Live", "History", "Resolved"];

  const filtered = markets.filter(m => {
    const display = getMarketDisplay(m);

    if (filter === "Live") return display.isLiveListItem;

    // History: expired open markets (with or without bets), cancelled, AND resolved
    if (filter === "History") return (
      display.isEmptyExpired ||
      display.isSoloBetExpired ||
      display.isRunningClosed ||
      m.status === "Cancelled" ||
      m.status === "Resolved"
    );

    if (filter === "Resolved") return m.status === "Resolved";

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    // Within history/resolved, sort newest first (highest createdAt)
    if (filter !== "Live") return Number(b.createdAt) - Number(a.createdAt);
    // Live: sort by pool size descending
    return getMarketPool(b) - getMarketPool(a);
  });

  const totalPool = markets.reduce((acc, m) => acc + getMarketPool(m), 0);
  const resolved = markets.filter(m => m.status === "Resolved");
  const agentWins = resolved.filter(m => m.agentCorrect).length;
  const accuracy = resolved.length > 0 ? Math.round((agentWins / resolved.length) * 100) : 0;

  return (
    <div className="page">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--text)", letterSpacing: "0.04em", marginBottom: 6 }}>
        ALL MARKETS
      </h1>

      <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 28, letterSpacing: "0.06em" }}>
        Every question. Every prediction. All on-chain.
      </p>

      <div className="grid-3" style={{ marginBottom: 28 }}>
        {[
          { label: "Total Markets", value: markets.length, img: "/images/stat-markets.png" },
          { label: "Total Staked",  value: `${totalPool.toFixed(0)} USDC`, img: "/images/stat-staked.png" },
          { label: "Oracle Accuracy", value: `${accuracy}%`, img: "/images/stat-accuracy.png" },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
            <img
              src={s.img}
              alt=""
              onError={e => e.currentTarget.style.display = "none"}
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 90, height: 64, objectFit: "cover", objectPosition: "top",
                opacity: 0.12, borderTopLeftRadius: 8, pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--silver)", letterSpacing: "0.04em" }}>
                {s.value}
              </div>
              <div className="label" style={{ marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn ${filter === f ? "btn-silver" : "btn-outline"}`}
            style={{ fontSize: 12, padding: "7px 16px" }}
          >
            {f}
            {f === "History" && (
              <span style={{
                marginLeft: 6,
                background: "rgba(192,192,192,0.15)",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
                color: "var(--text3)",
              }}>
                {markets.filter(m => {
                  const d = getMarketDisplay(m);
                  return d.isEmptyExpired || d.isSoloBetExpired || d.isRunningClosed || m.status === "Cancelled" || m.status === "Resolved";
                }).length}
              </span>
            )}
            {f === "Resolved" && (
              <span style={{
                marginLeft: 6,
                background: "rgba(192,192,192,0.15)",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
                color: "var(--text3)",
              }}>
                {resolved.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <div className="spinner" style={{ margin: "40px auto" }} />}

      {!loading && sorted.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text3)" }}>
            {filter === "Live" ? "No live markets right now." :
             filter === "History" ? "No closed markets yet." :
             "No resolved markets yet."}
          </p>
        </div>
      )}

      <div className="grid-2">
        {sorted.map(m => <MarketCard key={m.id} market={m} />)}
      </div>
         <div style={{ marginTop: 40, padding: 16, background: "var(--bg3)", border: "1px solid #2a2200", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <p style={{ fontSize: 12, color: "#a08030", lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: "#d4a017" }}>Testnet Mode:</strong> You're in Testnet Mode — all matches will be simulated by AI, based on Live Player and Country data. No real funds are at risk.
        </p>
      </div>
    </div>
  );
}