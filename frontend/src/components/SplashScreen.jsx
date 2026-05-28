import { useEffect, useState } from "react";

export default function SplashScreen({ fading }) {
  const [ballPos, setBallPos] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBallPos(prev => (prev + 1) % 3);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      width: "100vw", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", background: "#000",
      opacity: fading ? 0 : 1,
      transition: fading ? "opacity 0.6s ease" : "none",
    }}>

      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
        src="/videos/splash.mp4"
      />

      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.75) 100%)",
      }} />

      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", flexDirection: "column",
        alignItems: "center", textAlign: "center",
      }}>
        <h1 style={{
          fontFamily: "var(--font-display)", letterSpacing: "0.08em",
          color: "#c0c0c0", marginBottom: 8,
          fontSize: "clamp(76px, 15vw, 180px)", lineHeight: 0.9,
        }}>
          ORÁ<span style={{ color: "#fff" }}>CULO</span>
        </h1>
        <p style={{
          fontSize: 13, color: "#888",
          letterSpacing: "0.06em", marginBottom: 48,
        }}>
          Create your own prediction market
        </p>

        <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: "50%",
              background: ballPos === i ? "#c0c0c0" : "#222",
              border: `1px solid ${ballPos === i ? "#c0c0c0" : "#333"}`,
              transform: ballPos === i ? "scale(1.5)" : "scale(1)",
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              boxShadow: ballPos === i ? "0 0 12px rgba(192,192,192,0.6)" : "none",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}