import { useEffect, useState } from "react";

export default function Toast({ message, type = "info", onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 350);
    }, 3500);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [message]);

  if (!message) return null;

  const colors = {
    success: { bg: "#0a1f0a", border: "#1a4d2a", text: "#4caf72", icon: "✅" },
    error:   { bg: "#1f0a0a", border: "#4d1a1a", text: "#e05c5c", icon: "❌" },
    info:    { bg: "#0a0a1a", border: "#1a1a3a", text: "#8888cc", icon: "⚡" },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%",
      transform: `translateX(-50%) translateY(${visible ? "0" : "30px"})`,
      opacity: visible ? 1 : 0,
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      zIndex: 9999, background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: "12px 20px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
      minWidth: 240, maxWidth: 400, pointerEvents: "none",
    }}>
      <span style={{ fontSize: 16 }}>{c.icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{message}</span>
    </div>
  );
}