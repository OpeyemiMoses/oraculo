import { useNetwork } from "../context/NetworkContext.jsx";

const MAINNET_DATE = new Date("2026-06-11T00:00:00Z");

export default function NetworkSwitcher() {
  const { network, setNetwork } = useNetwork();
  const isMainnetLive = Date.now() >= MAINNET_DATE.getTime();

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 2,
      background: "#0a0a0a", border: "1px solid #222",
      borderRadius: 20, padding: "3px",
    }}>
      <button
        onClick={() => setNetwork("testnet")}
        style={{
          padding: "5px 14px", borderRadius: 14, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.04em", cursor: "pointer", border: "none", transition: "all 0.2s",
          background: network === "testnet" ? "#c0c0c0" : "transparent",
          color: network === "testnet" ? "#000" : "#555",
        }}
      >
        TESTNET
      </button>

      <button
        onClick={() => setNetwork("mainnet")}
        title={!isMainnetLive ? "Mainnet launches June 11, 2026" : "Switch to Mainnet"}
        style={{
          padding: "5px 14px", borderRadius: 14, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.04em", cursor: "pointer", border: "none", transition: "all 0.2s",
          background: network === "mainnet" ? "#f59e0b" : "transparent",
          color: network === "mainnet" ? "#000" : isMainnetLive ? "#f59e0b" : "#555",
        }}
      >
        MAINNET {!isMainnetLive && "🔒"}
      </button>
    </div>
  );
}