import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESS, ORACULO_ABI, API_URL } from "../config.js";
import { Link } from "react-router-dom";

export default function MyBets() {
  const { address, isConnected } = useAccount();
  const [bets, setBets] = useState([]);
  const [markets, setMarkets] = useState({});
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    async function loadBets() {
      setLoading(true);
      try {
        const [betsData, marketsData] = await Promise.all([
          fetch(`${API_URL}/user/${address}/bets`).then(r => r.json()),
          fetch(`${API_URL}/markets`).then(r => r.json()),
        ]);
        if (cancelled) return;
        setBets(betsData.bets || []);
        const map = {};
        (marketsData.markets || []).forEach(m => { map[m.id] = m; });
        setMarkets(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBets();
    return () => { cancelled = true; };
  }, [address]);

  async function claim(index) {
    setClaiming(index);
    try {
      await writeContractAsync({ address: CONTRACT_ADDRESS, abi: ORACULO_ABI, functionName: "claimWinnings", args: [BigInt(index)] });
      setBets(prev => prev.map((b, i) => i === index ? { ...b, claimed: true } : b));
    } catch (e) { alert(e.shortMessage || e.message); }
    setClaiming(null);
  }

  if (!isConnected) return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <p style={{ color: "var(--text3)" }}>Connect your wallet to see your bets</p>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--text)", letterSpacing: "0.04em", marginBottom: 24 }}>MY BETS</h1>

      {loading && <div className="spinner" style={{ margin: "40px auto" }} />}

      {!loading && bets.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚽</div>
          <p style={{ color: "var(--text3)", marginBottom: 16 }}>No bets yet.</p>
          <Link to="/" className="btn btn-silver">Ask the Oracle</Link>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {bets.map((bet, i) => {
          const market = markets[bet.marketId];
          const canClaim = market?.status === "Resolved" && !bet.claimed &&
            ((market.agentCorrect && bet.side === "With") || (!market.agentCorrect && bet.side === "Against"));
          return (
            <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <Link to={`/market/${bet.marketId}`} style={{ textDecoration: "none" }}>
                  <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8, lineHeight: 1.4 }}>
                    {market?.question || `Market #${bet.marketId}`}
                  </p>
                </Link>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span className={`tag ${bet.side === "With" ? "tag-open" : "tag-cancelled"}`}>
                    {bet.side === "With" ? "🤝 With" : "⚔️ Against"}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)" }}>
                    {parseFloat(bet.amount).toFixed(2)} USDC
                  </span>
                {bet.claimed && <span className="tag tag-resolved">Claimed ✅</span>}
{market?.status === "Resolved" && !bet.claimed && (() => {
  const won = (market.agentCorrect && bet.side === "With") || (!market.agentCorrect && bet.side === "Against");
  return won
    ? <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green3)", border: "1px solid #1a4d2a", borderRadius: 6, padding: "3px 8px" }}>Won 🏆</span>
    : <span style={{ fontSize: 11, fontWeight: 700, color: "#e05c5c", border: "1px solid #4d1a1a", borderRadius: 6, padding: "3px 8px" }}>Lost ❌</span>;
})()}
{market && <span className={`tag ${market.status === "Open" ? "tag-open" : "tag-resolved"}`}>{market.status}</span>}
                </div>
              </div>
              {canClaim && (
                <button className="btn btn-silver" onClick={() => claim(i)} disabled={claiming === i} style={{ minWidth: 90 }}>
                  {claiming === i ? <span className="spinner" /> : "Claim 🏆"}
                </button>
              )}
            </div>
          );
        })}
      </div>
         <div style={{ marginTop: 40, padding: 16, background: "var(--bg3)", border: "1px solid #2a2200", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <p style={{ fontSize: 12, color: "#a08030", lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: "#d4a017" }}>Testnet Mode:</strong> You're in Testnet Mode — all matches will be simulated by AI, based on the AI confidence level. No real funds are at risk.
        </p>
      </div>
    </div>
  );
}
