import { Link, useLocation } from "react-router-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState, useRef, useEffect } from "react";
import Toast from "./Toast.jsx";
import NetworkSwitcher from "./NetworkSwitcher.jsx";
import { useNetwork } from "../context/NetworkContext.jsx";
import { useSwitchChain } from "wagmi";

function getDetectedWallets() {
  if (typeof window === "undefined") return [];
  const eth = window.ethereum;
  const providers = eth?.providers?.length ? eth.providers : eth ? [eth] : [];

  const walletChecks = [
    { id: "okx",       name: "OKX Wallet",       icon: "/images/okx.png",       getProvider: () => providers.find(p => p.isOkxWallet || p.isOKExWallet) || window.okxwallet || null },
     { id: "metamask",  name: "MetaMask",        icon: "/images/metamask.png",  getProvider: () => providers.find(p => p.isMetaMask && !p.isOkxWallet) || null },
    { id: "coinbase",  name: "Coinbase Wallet",  icon: "/images/coinbase.png",  getProvider: () => providers.find(p => p.isCoinbaseWallet) || null },
    { id: "trust",     name: "Trust Wallet",     icon: "/images/trust.png",     getProvider: () => providers.find(p => p.isTrust || p.isTrustWallet) || null },
    { id: "rabby",     name: "Rabby Wallet",     icon: "/images/rabby.png",     getProvider: () => providers.find(p => p.isRabby) || null },
    { id: "phantom",   name: "Phantom",          icon: "/images/phantom.png",   getProvider: () => window.phantom?.ethereum || providers.find(p => p.isPhantom) || null },
  ];

  const detected = walletChecks
    .map(w => ({ ...w, provider: w.getProvider() }))
    .filter(w => w.provider);

  if (!detected.length && eth) {
    detected.push({ id: "browser-wallet", name: "Browser Wallet", icon: "/images/icon.png", provider: eth });
  }
  return detected;
}

export default function Navbar() {
  const location   = useLocation();
  const { address, isConnected } = useAccount();
  const { connect, connectors }  = useConnect();
  const { disconnect }           = useDisconnect();
  const { network }              = useNetwork();

  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [detectedWallets, setDetectedWallets] = useState([]);
  const [menuOpen, setMenuOpen]               = useState(false);
  const [toast, setToast]                     = useState(null);
  const dropdownRef  = useRef(null);
  const menuRef      = useRef(null);
  const prevConnected = useRef(false);

  const nav = [
    { path: "/",            label: "Oracle" },
    { path: "/my-bets",     label: "My Bets" },
    { path: "/leaderboard", label: "Open Markets" },
    { path: "/how",         label: "How It Works" },
    { path: "/wallet",      label: "Wallet" },
  ];

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  useEffect(() => {
    if (isConnected && !prevConnected.current) {
      setToast({ message: "Wallet connected successfully", type: "success" });
    }
    prevConnected.current = isConnected;
  }, [isConnected]);

  function openWalletModal() {
    setDetectedWallets(getDetectedWallets());
    setWalletModalOpen(true);
  }

function connectWallet(wallet) {
  const connector =
    connectors.find(item => item.id === wallet.id) ||
    connectors.find(item => item.name === wallet.name) ||
    connectors[0];
  connect({ connector, chainId: 1952 });
  setWalletModalOpen(false);
}

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (menuRef.current    && !menuRef.current.contains(e.target))      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <>
      <nav style={{ background: "#000", borderBottom: "1px solid #1f1f1f", position: "sticky", top: 0, zIndex: 100, padding: "0 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>

          <Link to="/" style={{ textDecoration: "none", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "0.08em", color: "#c0c0c0" }}>
              ORÁ<span style={{ color: "#fff" }}>CULO</span>
            </span>
          </Link>

          <div style={{ display: "flex", gap: 2, alignItems: "center" }} className="desktop-nav">
            {nav.map(item => (
              <Link key={item.path} to={item.path} style={{
                padding: "6px 14px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em",
                color: location.pathname === item.path ? "#c0c0c0" : "#444",
                background: location.pathname === item.path ? "rgba(192,192,192,0.08)" : "transparent",
                transition: "all 0.15s",
              }}>{item.label}</Link>
            ))}

            {network === "testnet" && (
              <a
                href="https://web3.okx.com/xlayer/faucet/xlayerfaucet"
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "6px 14px", borderRadius: 8, textDecoration: "none",
                  fontSize: 13, fontWeight: 600, letterSpacing: "0.02em",
                  color: "#f59e0b", border: "1px solid #3a2a00",
                  transition: "all 0.15s", background: "transparent",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(245,158,11,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                Get Test Tokens
              </a>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }} ref={dropdownRef}>
              {isConnected ? (
                <>
                  <button onClick={() => setDropdownOpen(prev => !prev)} style={{
                    display: "flex", alignItems: "center", gap: 8, background: "transparent",
                    border: "1px solid #2a2a2a", borderRadius: 8, padding: "7px 14px",
                    color: "#c0c0c0", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    ⚽ <span className="wallet-short">{short}</span>
                  </button>

                  {dropdownOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 8px)", right: 0,
                      background: "#0a0a0a", border: "1px solid #222", borderRadius: 10,
                      padding: 8, minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.8)", zIndex: 200,
                    }}>
                      <div style={{ padding: "8px 12px", fontSize: 11, color: "#444", letterSpacing: "0.04em", borderBottom: "1px solid #1a1a1a", marginBottom: 6, fontFamily: "monospace", wordBreak: "break-all" }}>
                        {address}
                      </div>
                      <button onClick={() => { disconnect(); setDropdownOpen(false); }} style={{
                        width: "100%", background: "transparent", border: "none", borderRadius: 6,
                        padding: "9px 12px", color: "#9e4a60", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
                      }}>
                        Disconnect Wallet
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button onClick={openWalletModal} style={{
                  background: "#c0c0c0", color: "#000", border: "none", borderRadius: 8,
                  padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>
                  Connect
                </button>
              )}
            </div>

            <NetworkSwitcher />

            <button className="hamburger" onClick={() => setMenuOpen(prev => !prev)} style={{
              display: "none", background: "transparent", border: "1px solid #2a2a2a",
              borderRadius: 8, padding: "7px 10px", cursor: "pointer", color: "#c0c0c0", fontSize: 18, lineHeight: 1,
            }}>
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>

      {walletModalOpen && (
        <div onClick={() => setWalletModalOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
          zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 420, background: "#050505",
            border: "1px solid #222", borderRadius: 12, boxShadow: "0 20px 80px rgba(0,0,0,0.9)", padding: 18,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: "0.06em", color: "#c0c0c0" }}>CONNECT WALLET</h3>
                <p style={{ margin: "4px 0 0", color: "#555", fontSize: 13 }}>Choose a detected browser wallet</p>
              </div>
              <button onClick={() => setWalletModalOpen(false)} style={{
                background: "transparent", border: "1px solid #222", color: "#777",
                borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 18,
              }}>×</button>
            </div>

            {detectedWallets.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {detectedWallets.map(wallet => (
                  <button key={wallet.id} onClick={() => connectWallet(wallet)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    background: "#0b0b0b", border: "1px solid #1f1f1f", borderRadius: 10,
                    padding: "14px 16px", color: "#c0c0c0", cursor: "pointer",
                    textAlign: "left", fontSize: 15, fontWeight: 700,
                  }}>
                    <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#111", display: "grid", placeItems: "center", flexShrink: 0, overflow: "hidden" }}>
                      <img
                        src={wallet.icon}
                        alt={`${wallet.name} logo`}
                        onError={e => { e.currentTarget.style.display = "none"; }}
                        style={{ width: 24, height: 24, objectFit: "contain", display: "block" }}
                      />
                    </span>
                    <span>{wallet.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ border: "1px dashed #2a2a2a", borderRadius: 10, padding: 18, color: "#666", fontSize: 14, lineHeight: 1.5 }}>
                No browser wallet detected. Install MetaMask, OKX Wallet, Coinbase Wallet, Trust Wallet, Rabby, or another EVM wallet, then reload this page.
              </div>
            )}
          </div>
        </div>
      )}

      {menuOpen && (
        <div ref={menuRef} style={{
          position: "fixed", top: 60, left: 0, right: 0,
          background: "#000", borderBottom: "1px solid #1f1f1f",
          zIndex: 99, padding: "12px 20px 20px",
        }}>
          {nav.map(item => (
            <Link key={item.path} to={item.path} style={{
              display: "block", padding: "12px 16px", borderRadius: 8,
              textDecoration: "none", fontSize: 15, fontWeight: 600,
              color: location.pathname === item.path ? "#c0c0c0" : "#555",
              background: location.pathname === item.path ? "rgba(192,192,192,0.06)" : "transparent",
              marginBottom: 4,
            }}>{item.label}</Link>
          ))}
          {network === "testnet" && (
            <a href="https://web3.okx.com/xlayer/faucet/xlayerfaucet" target="_blank" rel="noreferrer" style={{
              display: "block", padding: "12px 16px", borderRadius: 8,
              textDecoration: "none", fontSize: 15, fontWeight: 600,
              color: "#f59e0b", marginBottom: 4,
            }}>Get Test Tokens</a>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
          .wallet-short { display: none; }
        }
      `}</style>
    </>
  );
}