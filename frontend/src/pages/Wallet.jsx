import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, USDC_ADDRESS, ORACULO_ABI, USDC_ABI } from "../config.js";
import Toast from "../components/Toast.jsx";

export default function Wallet() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount]    = useState("");
  const [action, setAction]    = useState("deposit");
  const [loading, setLoading]  = useState(false);
  const [toast, setToast]      = useState(null);
  const { writeContractAsync } = useWriteContract();

  const { data: oraculoBalance, refetch: refetchOraculo } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ORACULO_ABI, functionName: "getUserBalance",
    args: [address], query: { enabled: !!address },
  });
  const { data: walletBalance, refetch: refetchWallet } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: "balanceOf",
    args: [address], query: { enabled: !!address },
  });

  const oraculoBal = oraculoBalance ? parseFloat(ethers.formatUnits(oraculoBalance, 6)).toFixed(2) : "0.00";
  const walletBal  = walletBalance  ? parseFloat(ethers.formatUnits(walletBalance,  6)).toFixed(2) : "0.00";

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  async function handleDeposit() {
    if (!amount || parseFloat(amount) < 3) return showToast("Minimum deposit is 3 USDC", "error");
    if (parseFloat(amount) > parseFloat(walletBal)) return showToast("Insufficient wallet balance", "error");
    setLoading(true);
    try {
      const amountWei = ethers.parseUnits(amount, 6);
      await writeContractAsync({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve", args: [CONTRACT_ADDRESS, amountWei] });
      await writeContractAsync({ address: CONTRACT_ADDRESS, abi: ORACULO_ABI, functionName: "deposit", args: [amountWei] });
      refetchOraculo(); refetchWallet(); setAmount("");
      showToast(`Deposited ${amount} USDC successfully`, "success");
    } catch (e) {
      showToast(e.shortMessage || e.message, "error");
    } finally { setLoading(false); }
  }

  async function handleWithdraw() {
    if (!amount || parseFloat(amount) < 3) return showToast("Minimum withdrawal is 3 USDC", "error");
    if (parseFloat(amount) > parseFloat(oraculoBal)) return showToast("Insufficient Oráculo balance", "error");
    setLoading(true);
    try {
      const amountWei = ethers.parseUnits(amount, 6);
      await writeContractAsync({ address: CONTRACT_ADDRESS, abi: ORACULO_ABI, functionName: "withdraw", args: [amountWei] });
      refetchOraculo(); refetchWallet(); setAmount("");
      showToast(`Withdrew ${amount} USDC to your wallet`, "success");
    } catch (e) {
      showToast(e.shortMessage || e.message, "error");
    } finally { setLoading(false); }
  }

  if (!isConnected) return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
      <p style={{ color: "var(--text3)" }}>Connect your wallet to manage funds</p>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 500 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--text)", letterSpacing: "0.04em", marginBottom: 24 }}>WALLET</h1>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="label" style={{ marginBottom: 6 }}>Wallet Balance</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--text)", letterSpacing: "0.04em" }}>{walletBal}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>USDC</div>
        </div>
        <div className="card" style={{ textAlign: "center", borderColor: "var(--border2)" }}>
          <div className="label" style={{ marginBottom: 6 }}>Oráculo Balance</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--silver)", letterSpacing: "0.04em" }}>{oraculoBal}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>USDC · Available to bet</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["deposit", "withdraw"].map(a => (
          <button key={a} onClick={() => setAction(a)}
            className={`btn ${action === a ? "btn-silver" : "btn-outline"}`}
            style={{ flex: 1, textTransform: "capitalize" }}>
            {a === "deposit" ? "⚽ Deposit" : "⚽ Withdraw"}
          </button>
        ))}
      </div>

      <div className="card">
        <p className="label" style={{ marginBottom: 12, color: "var(--silver)" }}>
          {action === "deposit" ? "Deposit USDC into Oráculo" : "Withdraw USDC to your wallet"}
        </p>
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16, lineHeight: 1.6 }}>
          {action === "deposit"
            ? "Minimum 3 USDC. Funds are available to bet immediately. Withdraw anytime."
            : "Minimum 3 USDC. Funds return to your wallet instantly."}
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input
            type="number" min={3} value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Amount (min 3 USDC)"
            style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none" }}
          />
          <button className="btn btn-silver"
            onClick={action === "deposit" ? handleDeposit : handleWithdraw}
            disabled={!amount || loading}>
            {loading ? "..." : action === "deposit" ? "Deposit" : "Withdraw"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 16, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--text3)", lineHeight: 1.7 }}>
        Your funds are always yours — the Oráculo smart contract holds them on-chain. Withdraw at any time when not in an active bet.
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
         <div style={{ marginTop: 40, padding: 16, background: "var(--bg3)", border: "1px solid #2a2200", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <p style={{ fontSize: 12, color: "#a08030", lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: "#d4a017" }}>Testnet Mode:</strong> You're in Testnet Mode — all matches will be simulated by AI, based on Live Player and Country data. No real funds are at risk.
        </p>
      </div>
    </div>
  );
}