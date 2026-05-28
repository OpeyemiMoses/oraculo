import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./config.js";
import App from "./App.jsx";
import "./index.css";
// Suppress wallet provider redefinition errors
window.addEventListener("error", e => {
  if (e.message?.includes("Cannot redefine property: ethereum")) {
    e.preventDefault();
  }
});
const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
  <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);