import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, ORACULO_ABI, API_URL } from "../config.js";
import { getMarketDisplay } from "../utils/marketStatus.js";
import Toast from "../components/Toast.jsx";

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

export default function Market() {
  const { id } = useParams();
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const [market, setMarket] = useState(null);
  const [amount, setAmount] = useState("");
  const [side, setSide] = useState(null);
  const [txStatus, setTxStatus] = useState("");
  const [toast, setToast] = useState(null);
  const { writeContractAsync } = useWriteContract();

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ORACULO_ABI,
    functionName: "getUserBalance",
    args: [address],
    query: { enabled: !!address },
  });

  useEffect(() => {
    // Use data passed from Home page instantly if available
    if (location.state?.market?.question) {
      setMarket(location.state.market);
      return;
    }
    // Otherwise fetch from API with retries
    let attempts = 0;
    let timer = null;
    function fetchMarket() {
      fetch(`${API_URL}/markets/${id}`)
        .then(r => r.json())
        .then(d => {
          if (d.market?.question) {
            setMarket(d.market);
          } else if (attempts < 10) {
            attempts++;
            timer = setTimeout(fetchMarket, 3000);
          }
        })
        .catch(() => {
          if (attempts < 10) {
            attempts++;
            timer = setTimeout(fetchMarket, 3000);
          }
        });
    }
    fetchMarket();
    return () => { if (timer) clearTimeout(timer); };
  }, [id]);

  async function placeBet() {
    if (!amount || !side || !isConnected) return;

    // ── Balance check ────────────────────────────────────────────────────────
    const userBalanceNum = balance
      ? parseFloat(ethers.formatUnits(balance, 6))
      : 0;
    const betAmount = parseFloat(amount);

    if (betAmount < 3) {
      showToast("Minimum bet is 3 USDC.", "error");
      return;
    }
    if (betAmount > userBalanceNum) {
      showToast(
        `Insufficient balance — you have ${userBalanceNum.toFixed(2)} USDC but tried to bet ${betAmount.toFixed(2)} USDC.`,
        "error"
      );
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    setTxStatus("Placing bet...");
    try {
      const amountWei = ethers.parseUnits(amount, 6);
      await writeContractAsync({
        address: CONTRACT_ADDRESS, abi: ORACULO_ABI, functionName: "placeBet",
        args: [BigInt(id), side === "with" ? 0 : 1, amountWei],
      });
      setTxStatus("✅ Bet placed!");
      showToast(`Bet placed — ${betAmount.toFixed(2)} USDC ${side === "with" ? "With" : "Against"} the Oracle!`, "success");
      setTimeout(() => setTxStatus(""), 4000);
    } catch (e) {
      setTxStatus(`❌ ${e.shortMessage || e.message}`);
      showToast(e.shortMessage || e.message, "error");
    }
  }

  if (!market) return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <div className="spinner" style={{ margin: "0 auto" }} />
    </div>
  );

  const userBalance = balance ? parseFloat(ethers.formatUnits(balance, 6)).toFixed(2) : "0.00";
  const display = getMarketDisplay(market);
  const totalPool = (parseFloat(market.poolWith || 0) + parseFloat(market.poolAgainst || 0)).toFixed(2);
  const withRisk = getRiskStyles(market.confidencePct, "with");
  const againstRisk = getRiskStyles(market.confidencePct, "against");

  // ── Closed-state banner logic ─────────────────────────────────────────────

  function renderClosedBanner() {
    // Resolved
    if (market.status === "Resolved") {
      return (
        <div className="card" style={{ textAlign: "center", padding: 24, borderColor: "var(--border2)" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{market.agentCorrect ? "🏆" : "❌"}</div>
          <p style={{ color: "var(--silver)", fontWeight: 700, fontSize: 16, letterSpacing: "0.04em" }}>
            Oracle was {market.agentCorrect ? "CORRECT" : "WRONG"}
          </p>
          <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 8 }}>
            {market.agentCorrect
              ? "Winners: bettors who sided With the Oracle."
              : "Winners: bettors who sided Against the Oracle."}
          </p>
        </div>
      );
    }

    // Expired with one-sided pool — solo or unchallenged bettors get refunded
    if (display.isSoloBetExpired) {
      const side = display.hasOnlyWithBets ? "With" : "Against";
      return (
        <div className="card" style={{ padding: 24, borderColor: "#3a2a00" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🤷</div>
          <p style={{ color: "#d4a017", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", marginBottom: 8 }}>
            You can't bet only yourself
          </p>
          <p style={{ color: "var(--text3)", fontSize: 13, lineHeight: 1.6 }}>
            All bets landed on the <strong style={{ color: "var(--silver)" }}>{side}</strong> side with nobody on the other.
            There's no one to bet against — your funds will be returned when this market is cancelled.
          </p>
          <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 10 }}>
            Total pool: <span style={{ color: "var(--silver)", fontWeight: 700 }}>{totalPool} USDC</span> — claimable after cancellation.
          </p>
        </div>
      );
    }

    // Expired with bets on both sides — running, waiting for resolution
    if (display.isRunningClosed) {
      const allWithOracleCorrect = display.poolAgainst === 0;
      const allAgainstOracleCorrect = display.poolWith === 0;

      let disclaimer = null;
      if (allWithOracleCorrect) {
        disclaimer = (
          <p style={{ color: "var(--green3)", fontSize: 13, marginTop: 10, fontStyle: "italic" }}>
            😌 You're all safe — everyone bet With the Oracle. If the oracle is right, everyone wins. If wrong, the platform keeps the pool.
          </p>
        );
      } else if (allAgainstOracleCorrect) {
        disclaimer = (
          <p style={{ color: "var(--green3)", fontSize: 13, marginTop: 10, fontStyle: "italic" }}>
            😌 You're all safe — everyone bet Against the Oracle. If the oracle is wrong, everyone wins. If right, the platform keeps the pool.
          </p>
        );
      }

      return (
        <div className="card" style={{ textAlign: "center", padding: 24, borderColor: "#4d1a2a" }}>
          <p style={{ color: "var(--red3)", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            This market is closed for betting
          </p>
          <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 8 }}>
            Currently running. Results will be resolved after the event.
          </p>
          <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 6 }}>
            Total pool: <span style={{ color: "var(--silver)", fontWeight: 700 }}>{totalPool} USDC</span>
          </p>
          {disclaimer}
        </div>
      );
    }

    // Expired with no bets
   
    

    return null;
  }

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <span className={`tag ${display.statusClass}`}>{display.statusLabel}</span>
        {market.detectedCountry && (
          <img src={`https://flagcdn.com/w40/${market.detectedCountry}.png`} alt="" style={{ width: 26, height: 17, borderRadius: 2 }} />
        )}
        {market.explorerUrl && (
          <a href={market.explorerUrl} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", marginLeft: "auto" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--silver)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
          >View on X Layer ↗</a>
        )}
      </div>

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--text)", letterSpacing: "0.02em", lineHeight: 1.2, marginBottom: 20 }}>
        {market.question}
      </h1>

      {/* Oracle Analysis */}
      {market.analysis && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, background: "var(--silver)", borderRadius: "50%" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--silver)", letterSpacing: "0.06em" }}>ORACLE ANALYSIS</span>
          </div>
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.65, marginBottom: 12 }}>{market.analysis}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="label">Confidence</span>
            <div className="conf-bar-wrap" style={{ flex: 1 }}>
              <div className="conf-bar" style={{ width: `${market.confidencePct}%` }} />
            </div>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--silver)", fontWeight: 700, fontSize: 13 }}>{market.confidencePct}%</span>
          </div>
        </div>
      )}

      {/* Confidence — show if no analysis */}
      {!market.analysis && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="label">Oracle Confidence</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--silver)", fontWeight: 700, fontSize: 13 }}>{market.confidencePct}%</span>
          </div>
          <div className="conf-bar-wrap"><div className="conf-bar" style={{ width: `${market.confidencePct}%` }} /></div>
        </div>
      )}

      {/* Pool stats */}
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div className="card" style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
          <img src="/images/pool-with.jpg" alt="" onError={e => e.currentTarget.style.display = "none"}
            style={{ position: "absolute", bottom: 0, right: 0, width: 90, height: 64, objectFit: "cover", opacity: 0.12, borderTopLeftRadius: 8, pointerEvents: "none" }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="label" style={{ marginBottom: 6 }}>With Oracle Pool</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--green3)", letterSpacing: "0.04em" }}>{parseFloat(market.poolWith || 0).toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>USDC</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
          <img src="/images/pool-against.jpg" alt="" onError={e => e.currentTarget.style.display = "none"}
            style={{ position: "absolute", bottom: 0, right: 0, width: 90, height: 64, objectFit: "cover", opacity: 0.12, borderTopLeftRadius: 8, pointerEvents: "none" }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="label" style={{ marginBottom: 6 }}>Against Oracle Pool</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--red3)", letterSpacing: "0.04em" }}>{parseFloat(market.poolAgainst || 0).toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>USDC</div>
          </div>
        </div>
      </div>

      {/* Active betting UI */}
      {display.isActiveBettable && isConnected && (
        <div className="card">
          <p className="label" style={{ marginBottom: 6, color: "var(--silver)" }}>Place Your Bet</p>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
            Balance: <span style={{ color: "var(--silver)", fontWeight: 700 }}>{userBalance} USDC</span>
          </p>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <button onClick={() => setSide("with")} style={{
              padding: 14, borderRadius: 10, cursor: "pointer", transition: "all 0.15s", textAlign: "left",
              border: `1px solid ${side === "with" ? withRisk.border : "var(--border)"}`,
              background: side === "with" ? withRisk.background : "var(--bg3)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: withRisk.labelColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>🤝 With Oracle</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: withRisk.mainColor, letterSpacing: "0.04em" }}>With</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{withRisk.label}</div>
            </button>
            <button onClick={() => setSide("against")} style={{
              padding: 14, borderRadius: 10, cursor: "pointer", transition: "all 0.15s", textAlign: "left",
              border: `1px solid ${side === "against" ? againstRisk.border : "var(--border)"}`,
              background: side === "against" ? againstRisk.background : "var(--bg3)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: againstRisk.labelColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>⚔️ Against Oracle</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: againstRisk.mainColor, letterSpacing: "0.04em" }}>Against</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{againstRisk.label}</div>
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input type="number" min={3} max={5000} value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Amount (3 – 5000 USDC)"
              style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none" }}
            />
            <button className="btn btn-silver" onClick={placeBet} disabled={!side || !amount}>Place Bet</button>
          </div>
          {txStatus && (
            <p style={{ fontSize: 13, color: txStatus.startsWith("✅") ? "var(--green3)" : txStatus.startsWith("❌") ? "var(--red3)" : "var(--silver2)" }}>{txStatus}</p>
          )}
        </div>
      )}

      {!isConnected && display.isActiveBettable && (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "var(--text3)" }}>Connect your wallet to place a bet</p>
        </div>
      )}

      {/* Closed / resolved / disclaimer banners */}
      {!display.isActiveBettable && renderClosedBanner()}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}