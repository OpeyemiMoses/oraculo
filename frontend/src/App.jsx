import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { NetworkProvider, useNetwork } from "./context/NetworkContext.jsx";
import Navbar from "./components/Navbar.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import MainnetCountdown from "./components/MainnetCountdown.jsx";
import Home from "./pages/Home.jsx";
import Market from "./pages/Market.jsx";
import MyBets from "./pages/MyBets.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Wallet from "./pages/Wallet.jsx";

function AppContent() {
  const location = useLocation();
  const { network } = useNetwork();
 const [showSplash, setShowSplash] = useState(() => {
  if (location.pathname !== "/") return false;
  if (sessionStorage.getItem("SplashScreen")) return false;
  return true;
});
  const [fadeSplash, setFadeSplash] = useState(false);

  const MAINNET_DATE = new Date("2026-06-11T00:00:00Z");
  const isMainnetLive = Date.now() >= MAINNET_DATE.getTime();
  const isMainnet = network === "mainnet";
  const isHowItWorks = location.pathname === "/how";

  useEffect(() => {
    if (!showSplash) return;
    const fadeTimer = window.setTimeout(() => setFadeSplash(true), 3000);
    const hideTimer = window.setTimeout(() => {
  sessionStorage.setItem("SplashScreen", "1");
  setShowSplash(false);
}, 3600);
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(hideTimer); };
  }, [showSplash]);

  if (showSplash && location.pathname === "/") {
    return <SplashScreen fading={fadeSplash} />;
  }

  return (
    <>
      <Navbar />
      {/* Show countdown on all pages except HowItWorks when mainnet is selected but not live */}
      {isMainnet && !isMainnetLive && !isHowItWorks ? (
        <MainnetCountdown />
      ) : (
        <Routes>
          <Route path="/"             element={<Home />} />
          <Route path="/market/:id"   element={<Market />} />
          <Route path="/my-bets"      element={<MyBets />} />
          <Route path="/leaderboard"  element={<Leaderboard />} />
          <Route path="/how"          element={<HowItWorks />} />
          <Route path="/wallet"       element={<Wallet />} />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NetworkProvider>
        <AppContent />
      </NetworkProvider>
    </BrowserRouter>
  );
}