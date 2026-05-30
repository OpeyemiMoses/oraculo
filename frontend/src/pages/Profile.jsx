import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { API_URL } from "../config.js";

const WC_COUNTRIES = [
  { code: "us", name: "United States" },
  { code: "ca", name: "Canada" },
  { code: "mx", name: "Mexico" },
  { code: "dz", name: "Algeria" },
  { code: "cv", name: "Cape Verde" },
  { code: "ci", name: "Ivory Coast" },
  { code: "eg", name: "Egypt" },
  { code: "gh", name: "Ghana" },
  { code: "ma", name: "Morocco" },
  { code: "sn", name: "Senegal" },
  { code: "za", name: "South Africa" },
  { code: "tn", name: "Tunisia" },
  { code: "cd", name: "DR Congo" },
  { code: "au", name: "Australia" },
  { code: "ir", name: "Iran" },
  { code: "jp", name: "Japan" },
  { code: "jo", name: "Jordan" },
  { code: "kr", name: "South Korea" },
  { code: "qa", name: "Qatar" },
  { code: "sa", name: "Saudi Arabia" },
  { code: "uz", name: "Uzbekistan" },
  { code: "iq", name: "Iraq" },
  { code: "at", name: "Austria" },
  { code: "be", name: "Belgium" },
  { code: "ba", name: "Bosnia & Herz." },
  { code: "hr", name: "Croatia" },
  { code: "cz", name: "Czech Republic" },
  { code: "gb-eng", name: "England" },
  { code: "fr", name: "France" },
  { code: "de", name: "Germany" },
  { code: "nl", name: "Netherlands" },
  { code: "no", name: "Norway" },
  { code: "pt", name: "Portugal" },
  { code: "gb-sct", name: "Scotland" },
  { code: "es", name: "Spain" },
  { code: "se", name: "Sweden" },
  { code: "ch", name: "Switzerland" },
  { code: "tr", name: "Turkey" },
  { code: "cw", name: "Curaçao" },
  { code: "ht", name: "Haiti" },
  { code: "pa", name: "Panama" },
  { code: "ar", name: "Argentina" },
  { code: "br", name: "Brazil" },
  { code: "co", name: "Colombia" },
  { code: "ec", name: "Ecuador" },
  { code: "py", name: "Paraguay" },
  { code: "uy", name: "Uruguay" },
  { code: "nz", name: "New Zealand" },
];

const FLAG_COLORS = {
  us: "#3c3b6e", ca: "#ff0000", mx: "#006847", dz: "#006233", cv: "#003893",
  ci: "#f77f00", eg: "#ce1126", gh: "#006b3f", ma: "#c1272d", sn: "#00853f",
  za: "#007a4d", tn: "#e70013", cd: "#007fff", au: "#00008b", ir: "#239f40",
  jp: "#bc002d", jo: "#007a3d", kr: "#003478", qa: "#8d1b3d", sa: "#006c35",
  uz: "#1eb53a", iq: "#ce1126", at: "#ed2939", be: "#333333", ba: "#002395",
  hr: "#ff0000", cz: "#d7141a", "gb-eng": "#cf111a", fr: "#002395", de: "#dd0000",
  nl: "#ae1c28", no: "#ef2b2d", pt: "#006600", "gb-sct": "#005eb8", es: "#aa151b",
  se: "#006aa7", ch: "#ff0000", tr: "#e30a17", cw: "#002b7f", ht: "#00209f",
  pa: "#db1116", ar: "#74acdf", br: "#009c3b", co: "#fcd116", ec: "#ffd100",
  py: "#d52b1e", uy: "#5aaae7", nz: "#00247d",
};

function StatCard({ label, value, sub }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "16px 12px", position: "relative", overflow: "hidden" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--silver)", letterSpacing: "0.04em", lineHeight: 1 }}>
        {value ?? "—"}
      </div>
      <div className="label" style={{ marginTop: 6, fontSize: 10 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function Profile() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

  const [bets, setBets] = useState([]);
  const [balance, setBalance] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState(() => {
    try { return JSON.parse(localStorage.getItem("oraculo_fav_countries") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (mounted && !isConnected && !address) navigate("/");
  }, [mounted, isConnected, address, navigate]);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/user/${address}/bets`).then(r => r.json()),
      fetch(`${API_URL}/user/${address}/balance`).then(r => r.json()),
      fetch(`${API_URL}/markets`).then(r => r.json()),
    ]).then(([betsData, balData, mktsData]) => {
      setBets(betsData.bets || []);
      setBalance(balData.balance || "0");
      setMarkets(mktsData.markets || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [address]);

  function toggleCountry(code) {
    setSelectedCountries(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      localStorage.setItem("oraculo_fav_countries", JSON.stringify(next));
      return next;
    });
  }

  // ── Stats computation ──
  const resolvedBets = bets.filter(b => {
    const market = markets.find(m => String(m.id) === String(b.marketId));
    return market?.status === "Resolved";
  });

  const wins = resolvedBets.filter(b => {
    const market = markets.find(m => String(m.id) === String(b.marketId));
    if (!market) return false;
    return (b.side === "With" && market.agentCorrect) || (b.side === "Against" && !market.agentCorrect);
  });
  const losses = resolvedBets.length - wins.length;
  const accuracy = resolvedBets.length > 0 ? Math.round((wins.length / resolvedBets.length) * 100) : null;

  // Country bet most wins
  const countryWinMap = {};
  wins.forEach(b => {
    const market = markets.find(m => String(m.id) === String(b.marketId));
    const country = market?.detectedCountry;
    if (country) countryWinMap[country] = (countryWinMap[country] || 0) + 1;
  });
  const topCountry = Object.entries(countryWinMap).sort((a, b) => b[1] - a[1])[0];

  // Top staked across open bets
  const openBets = bets.filter(b => {
    const market = markets.find(m => String(m.id) === String(b.marketId));
    return market?.status === "Open";
  });
  const totalStaked = openBets.reduce((acc, b) => acc + parseFloat(b.amount || 0), 0);

  const short = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : "";

  if (!mounted) return (
    <div className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--text)", letterSpacing: "0.04em", marginBottom: 4, lineHeight: 1 }}>
            PRO<span style={{ color: "var(--silver)" }}>FILE</span>
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 12, letterSpacing: "0.08em" }}>Your oracle activity & preferences</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate("/wallet")} style={{ fontSize: 13, padding: "9px 20px", color: "var(--silver)", border: "1px solid var(--silver)" }}>
          Deposit →
        </button>
      </div>

      {/* Wallet Card */}
      <div className="card" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Wallet Address</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--silver)", wordBreak: "break-all" }}>
            {address}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text3)" }}>
            Balance: <span style={{ color: "var(--silver)", fontWeight: 700 }}>{balance !== null ? `${parseFloat(balance).toFixed(2)} USDC` : "—"}</span>
          </div>
        </div>
        <button
          onClick={() => { disconnect(); navigate("/"); }}
          className="btn btn-outline"
          style={{ fontSize: 12, color: "#9e4a60", border: "1px solid #4d1a2a", padding: "8px 16px", flexShrink: 0 }}
        >
          Disconnect
        </button>
      </div>

      {/* Stats Grid */}
      <div className="label" style={{ marginBottom: 12 }}>Your Stats</div>
      {loading ? (
        <div className="spinner" style={{ margin: "32px auto" }} />
      ) : (
        <>
          <div className="grid-3" style={{ marginBottom: 10 }}>
            <StatCard label="Total Bets" value={bets.length} />
            <StatCard label="Wins" value={wins.length} />
            <StatCard label="Losses" value={losses} />
          </div>
          <div className="grid-3" style={{ marginBottom: 24 }}>
            <StatCard
              label="Your Accuracy"
              value={accuracy !== null ? `${accuracy}%` : "—"}
              sub={resolvedBets.length > 0 ? `${resolvedBets.length} resolved` : "No resolved bets yet"}
            />
            <StatCard
              label="Top Country"
              value={topCountry ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <img src={`https://flagcdn.com/w40/${topCountry[0]}.png`} alt={topCountry[0]}
                    style={{ width: 24, height: 16, borderRadius: 2, objectFit: "cover" }} />
                  {topCountry[1]}W
                </span>
              ) : "—"}
              sub={topCountry ? "most wins" : "No wins yet"}
            />
            <StatCard
              label="Open Staked"
              value={`${totalStaked.toFixed(2)}`}
              sub="USDC across open bets"
            />
          </div>

          {/* Recent Bets */}
          {bets.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="label" style={{ marginBottom: 12 }}>Recent Bets</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bets.slice(0, 5).map((bet, i) => {
                  const market = markets.find(m => String(m.id) === String(bet.marketId));
                  const isWin = market?.status === "Resolved" &&
                    ((bet.side === "With" && market.agentCorrect) || (bet.side === "Against" && !market.agentCorrect));
                  const isLoss = market?.status === "Resolved" && !isWin;
                  return (
                    <div key={i} className="card" style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 16px", gap: 12, flexWrap: "wrap",
                      borderLeft: `3px solid ${isWin ? "var(--green3)" : isLoss ? "var(--red3)" : "var(--border)"}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {market?.question || `Market #${bet.marketId}`}
                        </p>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: bet.side === "With" ? "var(--green3)" : "var(--red3)", fontWeight: 700 }}>
                            {bet.side}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text3)" }}>{parseFloat(bet.amount).toFixed(2)} USDC</span>
                          {market?.detectedCountry && (
                            <img src={`https://flagcdn.com/w40/${market.detectedCountry}.png`} alt=""
                              style={{ width: 18, height: 12, borderRadius: 2 }} />
                          )}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                        color: isWin ? "var(--green3)" : isLoss ? "var(--red3)" : "var(--text3)",
                        border: `1px solid ${isWin ? "#1a4d2a" : isLoss ? "#4d1a2a" : "var(--border)"}`,
                        whiteSpace: "nowrap",
                      }}>
                        {isWin ? "Won ✓" : isLoss ? "Lost ✗" : market?.status === "Open" ? "Open" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Country Picker */}
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="label">Your World Cup Teams</div>
        {selectedCountries.length > 0 && (
          <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedCountries.length} selected</span>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16, lineHeight: 1.5 }}>
        Pick the teams you're rooting for. Tap to select.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginBottom: 32 }}>
        {WC_COUNTRIES.map(({ code, name }) => {
          const selected = selectedCountries.includes(code);
          const color = FLAG_COLORS[code] || "#444";
          return (
            <button
              key={code}
              onClick={() => toggleCountry(code)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "12px 8px", borderRadius: 10, cursor: "pointer",
                background: selected ? `${color}22` : "var(--bg3)",
                border: selected ? `1px solid ${color}88` : "1px solid var(--border)",
                boxShadow: selected ? `0 0 10px ${color}33` : "none",
                transition: "all 0.15s",
              }}
            >
              <img
                src={`https://flagcdn.com/w40/${code}.png`}
                alt={name}
                style={{ width: 36, height: 24, borderRadius: 4, objectFit: "cover", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }}
                onError={e => e.currentTarget.style.display = "none"}
              />
              <span style={{ fontSize: 10, color: selected ? "var(--silver)" : "var(--text3)", fontWeight: selected ? 700 : 400, textAlign: "center", lineHeight: 1.3 }}>
                {name}
              </span>
              {selected && (
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 16, background: "var(--bg3)", border: "1px solid #2a2200", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <p style={{ fontSize: 12, color: "#a08030", lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: "#d4a017" }}>Testnet Mode:</strong> Stats are based on testnet activity. No real funds are at risk.
        </p>
      </div>
    </div>
  );
}