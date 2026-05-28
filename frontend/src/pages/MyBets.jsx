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

        // Group bets by marketId + side, summing amounts.
        // The backend returns one entry per on-chain bet transaction; a user
        // betting on the same market multiple times produces duplicate rows.
        // We merge them here so each (market, side) pair shows as one card.
        const rawBets = betsData.bets || [];
        const grouped = {};
        rawBets.forEach((bet, originalIndex) => {
          const key = `${bet.marketId}:${bet.side}`;
          if (!grouped[key]) {
            // Clone the bet so we can mutate amount safely.
            // Keep the first originalIndex for the claim call.
            grouped[key] = { ...bet, amount: parseFloat(bet.amount), originalIndex };
          } else {
            grouped[key].amount += parseFloat(bet.amount);
            // If any sub-bet is unclaimed, the merged bet should show as unclaimed
            if (!bet.claimed) grouped[key].claimed = false;
          }
        });

        // Convert amount back to string with 6 decimal places to stay consistent
        // with how the backend formats USDC (ethers.formatUnits precision).
        const mergedBets = Object.values(grouped).map(b => ({
          ...b,
          amount: b.amount.toFixed(6),
        }));

        setBets(mergedBets);

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

  // Mirrors _calculatePayout in OrauloFactory.sol exactly:
  // grossWinShare = (stake * loserPool) / winnerPool
  // fee           = grossWinShare * 2% (FEE_BPS = 200 / BPS = 10000)
  // payout        = stake + grossWinShare - fee
  //
  // The backend returns all USDC values as formatted decimal strings (e.g. "12.340000")
  // via ethers.formatUnits(value, 6). We convert them back to raw 6-decimal
  // integer BigInts before doing fixed-point math so the result matches the contract.
  function usdcStrToRaw(str) {
    const n = parseFloat(str);
    if (isNaN(n)) return 0n;
    return BigInt(Math.round(n * 1_000_000));
  }

  function calcPayout(bet, market) {
    if (!market) return null;

    const stake      = usdcStrToRaw(bet.amount);
    const winnerPool = bet.side === "With" ? usdcStrToRaw(market.poolWith) : usdcStrToRaw(market.poolAgainst);
    const loserPool  = bet.side === "With" ? usdcStrToRaw(market.poolAgainst) : usdcStrToRaw(market.poolWith);

    if (winnerPool === 0n) return null;
    if (loserPool === 0n) return { stake, grossWinShare: 0n, fee: 0n, payout: stake };

    const grossWinShare = (stake * loserPool) / winnerPool;
    const fee           = (grossWinShare * 200n) / 10000n;
    const payout        = stake + grossWinShare - fee;

    return { stake, grossWinShare, fee, payout };
  }

  // Format raw 6-decimal USDC BigInt to display string e.g. "12.34"
  function fmt(raw) {
    return (Number(raw) / 1_000_000).toFixed(2);
  }

  async function claim(bet) {
    const key = `${bet.marketId}:${bet.side}`;
    setClaiming(key);
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ORACULO_ABI,
        functionName: "claimWinnings",
        args: [BigInt(bet.originalIndex)],
      });
      setBets(prev =>
        prev.map(b =>
          b.marketId === bet.marketId && b.side === bet.side
            ? { ...b, claimed: true }
            : b
        )
      );
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
        {bets.map((bet) => {
          const market = markets[bet.marketId];
          const claimKey = `${bet.marketId}:${bet.side}`;
          const canClaim = market?.status === "Resolved" && !bet.claimed &&
            ((market.agentCorrect && bet.side === "With") || (!market.agentCorrect && bet.side === "Against"));
          const isResolved = market?.status === "Resolved";
          const won = isResolved && ((market.agentCorrect && bet.side === "With") || (!market.agentCorrect && bet.side === "Against"));
          const payout = won && market?.poolWith != null ? calcPayout(bet, market) : null;

          return (
            <div key={claimKey} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
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
                  {isResolved && !bet.claimed && (
                    won
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green3)", border: "1px solid #1a4d2a", borderRadius: 6, padding: "3px 8px" }}>Won 🏆</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, color: "#e05c5c", border: "1px solid #4d1a1a", borderRadius: 6, padding: "3px 8px" }}>Lost ❌</span>
                  )}
                  {market && <span className={`tag ${market.status === "Open" ? "tag-open" : "tag-resolved"}`}>{market.status}</span>}
                </div>

                {/* Payout breakdown — mirrors _calculatePayout in OrauloFactory.sol */}
                {won && payout && (
                  <div style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "rgba(0,200,80,0.06)",
                    border: "1px solid #1a4d2a",
                    borderRadius: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px 18px",
                    alignItems: "center",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Staked</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--silver)", fontWeight: 700 }}>
                        {fmt(payout.stake)} USDC
                      </span>
                    </div>
                    <span style={{ color: "var(--text3)", fontSize: 14, alignSelf: "flex-end", paddingBottom: 2 }}>+</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Winnings <span style={{ color: "#555" }}>(after 2% fee)</span></span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green3)", fontWeight: 700 }}>
                        +{fmt(payout.grossWinShare - payout.fee)} USDC
                      </span>
                    </div>
                    <span style={{ color: "var(--text3)", fontSize: 14, alignSelf: "flex-end", paddingBottom: 2 }}>=</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Payout</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--green3)", fontWeight: 900 }}>
                        {fmt(payout.payout)} USDC
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {canClaim && (
                <button className="btn btn-silver" onClick={() => claim(bet)} disabled={claiming === claimKey} style={{ minWidth: 90 }}>
                  {claiming === claimKey ? <span className="spinner" /> : "Claim 🏆"}
                </button>
              )}
            </div>
          );
        })}
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