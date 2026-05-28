import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config.js";
import MarketCard from "../components/MarketCard.jsx";
import { getMarketDisplay, getMarketPool } from "../utils/marketStatus.js";

// Ball loading animation
function BallLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
      <div style={{
        fontSize: 40,
        animation: "spin 0.8s linear infinite",
        display: "inline-block",
      }}>⚽</div>
      <p style={{ fontSize: 12, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        Consulting the oracle...
      </p>
    </div>
  );
}

function getRiskStyles(confidencePct, side) {
  const confidence = Number(confidencePct) || 50;
  const withIsLowerRisk = confidence >= 50;
  const isLowerRisk = side === "with" ? withIsLowerRisk : !withIsLowerRisk;

  return {
    label: isLowerRisk ? "Lower risk" : "Higher risk",
    background: isLowerRisk ? "var(--green)" : "var(--red)",
    border: isLowerRisk ? "#1a4d2a" : "#4d1a2a",
    labelColor: isLowerRisk ? "var(--green2)" : "var(--red2)",
    mainColor: isLowerRisk ? "var(--green3)" : "var(--red3)",
  };
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [allMarkets, setAllMarkets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, pool: "0" });
  const navigate = useNavigate();

useEffect(() => {
  fetch(`${API_URL}/markets`)
    .then(r => r.json())
    .then(d => {
    const all = d.markets || [];
const liveMarkets = all.filter(m => getMarketDisplay(m).isLiveListItem);
const activeOpen = all.filter(m => getMarketDisplay(m).isActiveBettable);
const pool = all.reduce((acc, m) => acc + getMarketPool(m), 0);

setMarkets(liveMarkets.slice(0, 6));
setAllMarkets(all); // keep all markets for duplicate checking
    const resolved = all.filter(m => m.status === "Resolved");
const agentWins = resolved.filter(m => m.agentCorrect).length;
const accuracy = resolved.length > 0 ? Math.round((agentWins / resolved.length) * 100) : null;

setStats({
  total: all.length,
  open: activeOpen.length,
  pool: pool.toFixed(0),
  accuracy: accuracy !== null ? `${accuracy}%` : "—",
});
    })
    .catch(() => {});
}, []);

  async function ask() {
    if (!question.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setResult(data);
      if (data.canCreateMarket && data.marketQuestion) {
  const duplicate = markets.find(m =>
    m.question?.toLowerCase().trim() === data.marketQuestion?.toLowerCase().trim()
  );
  if (duplicate) {
    setResult({ ...data, existingMarket: duplicate, canCreateMarket: false });
    return;
  }
}
    } catch {
      setResult({ error: "Failed to reach the oracle. Try again." });
    }
    setLoading(false);
  }

  async function createMarket() {
    if (!result || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/create-market`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:        result.marketQuestion,
          confidencePct:   result.confidencePct,
          analysis:        result.analysis,
          detectedCountry: result.detectedCountry,
        }),
      });
      const data = await res.json();
      if (data.success && data.market) {
        setResult(prev => ({ ...prev, market: data.market, explorerUrl: data.explorerUrl, marketCreated: true }));
        setMarkets(prev => [{ ...data.market, detectedCountry: result.detectedCountry }, ...prev.slice(0, 5)]);
        setStats(prev => ({ ...prev, total: prev.total + 1, open: prev.open + 1 }));
      }
    } catch {
      setResult(prev => ({ ...prev, createError: "Failed to create market. Try again." }));
    }
    setCreating(false);
  }

  function renderAction() {
    if (!result || result.error) return null;

    if (result.type === "NOT_WORLD_CUP") return (
      <div style={{ padding: "10px 14px", background: "rgba(158,74,96,0.08)", border: "1px solid #4d1a2a", borderRadius: 8, fontSize: 13, color: "var(--red3)" }}>
        ⚠️ This question does not need a market. No market will be created.
      </div>
    );

    if (result.type === "PAST_EVENT") return (
      <div style={{ padding: "10px 14px", background: "rgba(192,192,192,0.05)", border: "1px solid var(--border2)", borderRadius: 8, fontSize: 13, color: "var(--text3)" }}>
        📖 This is a past event — answered from historical data. No market created.
      </div>
    );

if (result.existingMarket && !result.marketCreated) {
  const isResolved = result.existingMarket.status === "Resolved";
  const createdAt = result.existingMarket.createdAt;
  const daysAgo = createdAt ? Math.floor((Date.now() / 1000 - createdAt) / 86400) : null;
  const timeAgo = daysAgo === 0 ? "today" : daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`;

  if (isResolved) {
    return (
      <div style={{ padding: 14, background: "#1a0a0a", border: "1px solid #4d1a1a", borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⌛</span>
          <p style={{ fontSize: 13, color: "var(--red3)", fontWeight: 700 }}>You missed this one</p>
        </div>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>
          This market was created <strong style={{ color: "var(--silver)" }}>{timeAgo}</strong> and has already been resolved. You missed your opportunity to bet on it.
        </p>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5, fontStyle: "italic" }}>
          "{result.existingMarket.question}"
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" style={{ fontSize: 12, padding: "7px 14px" }}
            onClick={() => navigate(`/market/${result.existingMarket.id}`)}>View Result →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 14, background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 13, color: "var(--silver)", fontWeight: 600 }}>⚡ A market already exists for this</p>
      <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>{result.existingMarket.question}</p>
      {result.existingMarket.analysis && (
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8 }}>
          {result.existingMarket.analysis}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-silver" style={{ fontSize: 12, padding: "7px 14px" }}
          onClick={() => navigate(`/market/${result.existingMarket.id}`)}>Go to Market →</button>
        <a href={result.existingMarket.explorerUrl} target="_blank" rel="noreferrer"
          className="btn btn-outline" style={{ fontSize: 12, padding: "7px 14px" }}>View on X Layer ↗</a>
      </div>
    </div>
  );
}

    if (result.marketCreated && result.market) {
      const withRisk = getRiskStyles(result.confidencePct, "with");
      const againstRisk = getRiskStyles(result.confidencePct, "against");

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "var(--green3)", fontSize: 13, fontWeight: 600 }}>✅ Market created on-chain</span>
            <button className="btn btn-outline" style={{ fontSize: 12, padding: "5px 12px" }}
              onClick={() => navigate(`/market/${result.market.id}`)}>Place Bet →</button>
            {result.explorerUrl && (
              <a href={result.explorerUrl} target="_blank" rel="noreferrer"
                className="btn btn-outline" style={{ fontSize: 12, padding: "5px 12px" }}>View on X Layer ↗</a>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, background: withRisk.background, border: `1px solid ${withRisk.border}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}
              onClick={() => navigate(`/market/${result.market.id}`)}>
              <div style={{ fontSize: 10, fontWeight: 700, color: withRisk.labelColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>With Oracle</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: withRisk.mainColor, letterSpacing: "0.04em" }}>With</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{withRisk.label}</div>
            </div>
            <div style={{ flex: 1, background: againstRisk.background, border: `1px solid ${againstRisk.border}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}
              onClick={() => navigate(`/market/${result.market.id}`)}>
              <div style={{ fontSize: 10, fontWeight: 700, color: againstRisk.labelColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Against Oracle</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: againstRisk.mainColor, letterSpacing: "0.04em" }}>Against</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{againstRisk.label}</div>
            </div>
          </div>
        </div>
      );
    }

    if (result.canCreateMarket && !result.marketCreated) {
      return (
        <div style={{ padding: 14, background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8 }}>
          <p style={{ fontSize: 13, color: "var(--silver)", marginBottom: 6, fontWeight: 600 }}>
            Want to create a prediction market for this?
          </p>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>
            "{result.marketQuestion}"
          </p>
          {result.createError && <p style={{ fontSize: 12, color: "var(--red3)", marginBottom: 8 }}>{result.createError}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-silver" onClick={createMarket} disabled={creating} style={{ fontSize: 13 }}>
              {creating ? <span className="spinner" /> : "Yes, Create Market ⚡"}
            </button>
            <button className="btn btn-outline" onClick={() => setResult(prev => ({ ...prev, canCreateMarket: false }))} style={{ fontSize: 13 }}>
              No thanks
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="page">
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 72, letterSpacing: "0.06em", lineHeight: 1, marginBottom: 10 }}>
          ORÁ<span style={{ color: "var(--silver)" }}>CULO</span>
        </h1>
        <p style={{ fontSize: 12, color: "var(--text3)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
          The World Cup AI Oracle · Ask anything · Bet everything
        </p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        {[
          { label: "Live Markets", value: stats.open, icon: "", img: "/images/stat-markets.png" },
          { label: "USDC Staked",  value: stats.pool,  icon: "", img: "/images/stat-staked.png" },
          { label: "Oracle Accuracy", value: stats.accuracy || "—", icon: "", img: "/images/stat-accuracy.png" },,
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: "16px 20px", position: "relative", overflow: "hidden" }}>
            {/* Your gallery image — place files in frontend/public/images/ */}
            <img src={s.img} alt="" onError={e => e.currentTarget.style.display = "none"}
              style={{ position: "absolute",objectPosition: "top", bottom: 0, right: 0, width: 90, height: 64, objectFit: "cover", opacity: 0.12, borderTopLeftRadius: 8, pointerEvents: "none" }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--silver)", letterSpacing: "0.04em" }}>{s.value}</div>
              <div className="label" style={{ marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Ask Box */}
      <div className="card" style={{ marginBottom: 28 }}>
        <p className="label" style={{ marginBottom: 14, color: "var(--silver)" }}>⚡ Ask the Oracle</p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ask()}
            placeholder="Will Mbappé score? Who will win the World Cup? Ask anything..."
            style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none" }}
          />
          <button className="btn btn-silver" onClick={ask} disabled={loading || !question.trim()} style={{ minWidth: 100 }}>
            {loading ? <span className="spinner" /> : "Ask ⚡"}
          </button>
        </div>

        {/* Ball loader */}
        {loading && <BallLoader />}

        {/* Result */}
        {!loading && result && (
          <div style={{ marginTop: 18, animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: 12 }}>
            {result.error ? (
              <p style={{ color: "var(--red3)", fontSize: 13 }}>{result.error}</p>
            ) : (
              <>
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, background: "var(--silver)", borderRadius: "50%" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--silver)", letterSpacing: "0.06em" }}>ORÁCULO SAYS</span>
                    {result.detectedCountry && (
                      <img src={`https://flagcdn.com/w40/${result.detectedCountry}.png`} alt="" style={{ width: 22, height: 15, borderRadius: 2, marginLeft: 4 }} />
                    )}
                  </div>
                  <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.65, marginBottom: result.confidencePct ? 12 : 0 }}>
                    {result.analysis}
                  </p>
                  {result.confidencePct > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="label">Confidence</span>
                      <div className="conf-bar-wrap" style={{ flex: 1 }}>
                        <div className="conf-bar" style={{ width: `${result.confidencePct}%` }} />
                      </div>
                      <span style={{ color: "var(--silver)", fontWeight: 700, fontSize: 13 }}>{result.confidencePct}%</span>
                    </div>
                  )}
                </div>
                {renderAction()}
              </>
            )}
          </div>
        )}
      </div>

      {/* Live Markets */}
      {markets.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="section-title"><div className="live-dot" />Live Markets</div>
            <button className="btn btn-outline" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => navigate("/leaderboard")}>
              View All
            </button>
          </div>
          <div className="grid-2">
            {markets.map(m => <MarketCard key={m.id} market={m} />)}
          </div>
        </div>
      )}
         <div style={{ marginTop: 40, padding: 16, background: "var(--bg3)", border: "1px solid #2a2200", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <p style={{ fontSize: 12, color: "#a08030", lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: "#d4a017" }}>Testnet Mode:</strong> You're in Testnet Mode — all matches will be simulated by AI, based on the AI confidence level. No real funds are at risk.
        </p>
      </div>
    </div>
  );
}