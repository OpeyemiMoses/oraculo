import { Link } from "react-router-dom";
import { getMarketDisplay } from "../utils/marketStatus.js";

// Primary flag color per country code
const FLAG_COLORS = {
  br: "#009c3b",   // Brazil green
  ar: "#74acdf",   // Argentina blue
  fr: "#002395",   // France blue
  de: "#dd0000",   // Germany red
  es: "#aa151b",   // Spain red
  pt: "#006600",   // Portugal green
  ng: "#008751",   // Nigeria green
  "gb-eng": "#cf111a", // England red
  us: "#3c3b6e",   // USA navy
  jp: "#bc002d",   // Japan red
  ma: "#c1272d",   // Morocco red
  mx: "#006847",   // Mexico green
  nl: "#ae1c28",   // Netherlands red
  be: "#000000",   // Belgium black
  hr: "#ff0000",   // Croatia red
  se: "#006aa7",   // Sweden blue
  pl: "#dc143c",   // Poland red
  rs: "#c6363c",   // Serbia red
  ch: "#ff0000",   // Switzerland red
  dk: "#c60c30",   // Denmark red
  au: "#00008b",   // Australia blue
  sa: "#006c35",   // Saudi Arabia green
  ir: "#239f40",   // Iran green
  uy: "#5aaae7",   // Uruguay blue
  co: "#fcd116",   // Colombia yellow
  ec: "#ffd100",   // Ecuador yellow
  cl: "#d52b1e",   // Chile red
  pe: "#d91023",   // Peru red
  sn: "#00853f",   // Senegal green
  gh: "#006b3f",   // Ghana green
  eg: "#ce1126",   // Egypt red
  cm: "#007a5e",   // Cameroon green
  ci: "#f77f00",   // Ivory Coast orange
  dz: "#006233",   // Algeria green
  tn: "#e70013",   // Tunisia red
  kr: "#003478",   // South Korea blue
  ca: "#ff0000",   // Canada red
  qa: "#8d1b3d",   // Qatar maroon
};

export default function MarketCard({ market }) {
  const display = getMarketDisplay(market);
  const totalPool = display.pool.toFixed(2);

  const flagColor = market.detectedCountry ? (FLAG_COLORS[market.detectedCountry] || null) : null;
  const cardBorder = flagColor
    ? `1px solid ${flagColor}55`   // 55 = ~33% opacity hex
    : undefined;
  const cardShadow = flagColor
    ? `0 0 12px ${flagColor}22`
    : undefined;

  // Resolved outcome badge
  const resolvedOutcome = market.status === "Resolved"
    ? (market.agentCorrect ? { label: "Oracle ✓", color: "var(--green3)", border: "#1a4d2a" }
                            : { label: "Oracle ✗", color: "var(--red3)",   border: "#4d1a2a" })
    : null;

  const questionText = (
    <p style={{
      fontSize: 13, color: "var(--text2)", lineHeight: 1.5,
      cursor: display.isActiveBettable ? "pointer" : "default",
      transition: "color 0.15s",
    }}
      onMouseEnter={e => { if (display.isActiveBettable) e.currentTarget.style.color = "var(--silver)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "var(--text2)"; }}
    >
      {market.question}
    </p>
  );

  return (
    <div className="card" style={{
      display: "flex", flexDirection: "column", gap: 12, minHeight: 140,
      position: "relative", overflow: "hidden",
      border: cardBorder,
      boxShadow: cardShadow,
    }}>

      {/* Flag colour strip on left edge */}
      {flagColor && (
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: 3, background: flagColor, opacity: 0.7, borderRadius: "8px 0 0 8px",
        }} />
      )}

      {market.detectedCountry && (
        <img
          src={`https://flagcdn.com/w40/${market.detectedCountry}.png`}
          alt={market.detectedCountry}
          style={{
            position: "absolute", bottom: 10, right: 10,
            width: 28, height: 19, borderRadius: 3,
            opacity: 0.9, zIndex: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        />
      )}

      {/* Question + status tag */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, position: "relative", zIndex: 1 }}>
        {display.isActiveBettable ? (
          <Link to={`/market/${market.id}`} style={{ textDecoration: "none", flex: 1, paddingRight: market.detectedCountry ? 36 : 0 }}>
            {questionText}
          </Link>
        ) : (
          <div style={{ flex: 1, paddingRight: market.detectedCountry ? 36 : 0 }}>{questionText}</div>
        )}
        <span className={`tag ${display.statusClass}`}>{display.statusLabel}</span>
      </div>

      {/* Confidence bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
        <span className="label">Confidence</span>
        <div className="conf-bar-wrap" style={{ flex: 1 }}>
          <div className="conf-bar" style={{ width: `${market.confidencePct}%` }} />
        </div>
        <span style={{ fontSize: 12, color: "var(--silver)", fontWeight: 700, minWidth: 32 }}>{market.confidencePct}%</span>
      </div>

      {/* Pool + status row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
        <div>
          <span className="label">Pool</span>
          <p style={{ fontSize: 13, color: "var(--silver)", fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: 2 }}>
            {totalPool} USDC
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {resolvedOutcome && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: resolvedOutcome.color,
              border: `1px solid ${resolvedOutcome.border}`,
              borderRadius: 6, padding: "3px 8px",
            }}>
              {resolvedOutcome.label}
            </span>
          )}

          {display.timerLabel && (
            <div style={{ textAlign: "right" }}>
              <span className="label">Status</span>
              <p style={{ fontSize: 12, color: display.isClosed ? "var(--red3)" : "var(--text3)", marginTop: 2 }}>
                {display.timerLabel}
              </p>
            </div>
          )}

          {market.explorerUrl && (
            <a href={market.explorerUrl} target="_blank" rel="noreferrer"
              style={{
                fontSize: 11, color: "var(--text3)", textDecoration: "none",
                border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--silver)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
            >
              X Layer ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}