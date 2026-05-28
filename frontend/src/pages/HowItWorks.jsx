export default function HowItWorks() {
  const steps = [
    { icon: "⚽", title: "Ask the Oracle", desc: "Type any World Cup question — match outcomes, player events, tactical scenarios. No limits." },
    { icon: "⚽", title: "AI Analysis", desc: "Oráculo's AI analyzes live match data, team form, player stats, and historical patterns to generate a prediction with a confidence score." },
    { icon: "⚽", title: "Market Opens On-Chain", desc: "Every prediction automatically creates a live prediction market on X Layer as soon a user accepts it. The confidence score sets the odds — no human intervention." },
    { icon: "⚽", title: "Pick Your Side", desc: "Bet WITH the oracle if you agree. Bet AGAINST if you think it's wrong. The total losing pool + user bet amount determines the payout multiplier on each side." },
    { icon: "⚽", title: "Match Happens", desc: "The real World Cup plays out. Goals are scored, cards are given, history is made." },
    { icon: "⚽", title: "Winners Paid Automatically", desc: "Once the market resolves, the contract splits the losing pool to winners — pro-rata, on-chain, no trust required." },
  ];

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--text)", letterSpacing: "0.04em", marginBottom: 8 }}>HOW IT WORKS</h1>
      <p style={{ color: "var(--text3)", marginBottom: 36, fontSize: 14 }}>AI prediction meets on-chain betting. Every question becomes a market.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {steps.map((step, i) => (
          <div key={i} className="card" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {step.icon}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span className="label">{String(i + 1).padStart(2, "0")}</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--silver)" }}>{step.title}</h3>
              </div>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24, borderColor: "var(--border2)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--silver)", marginBottom: 12, letterSpacing: "0.04em" }}>⚖️ HOW ODDS WORK</h3>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, marginBottom: 16 }}>
          The oracle's confidence score directly sets the odds. If Oráculo is 70% confident:
        </p>
        <div className="grid-2">
          <div style={{ background: "var(--green)", border: "1px solid #1a4d2a", borderRadius: 8, padding: 14 }}>
            <div style={{ color: "var(--green2)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>🤝 With Oracle</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--green3)", letterSpacing: "0.04em" }}></div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}></div>
          </div>
          <div style={{ background: "var(--red)", border: "1px solid #4d1a2a", borderRadius: 8, padding: 14 }}>
            <div style={{ color: "var(--red2)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>⚔️ Against Oracle</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--red3)", letterSpacing: "0.04em" }}></div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12, textAlign: "center", padding: 20 }}>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7 }}>
          Oráculo runs on <strong style={{ color: "var(--silver)" }}>X Layer</strong> — OKX's EVM-compatible L2.
          All markets, bets, and payouts are on-chain permanently. No intermediaries.
        </p>
      </div>
    </div>
  );
}