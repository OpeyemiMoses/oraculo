import { createContext, useContext, useState } from "react";

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const [network, setNetwork] = useState("testnet");
  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}