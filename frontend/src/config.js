import { http, createConfig, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

export const xlayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_RPC_URL || "https://testrpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer-test" },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [xlayerTestnet],
  connectors: [injected()],
  transports: {
    [xlayerTestnet.id]: http(import.meta.env.VITE_RPC_URL || "https://testrpc.xlayer.tech"),
  },
  storage: createStorage({
    storage: window.localStorage,
  }),
  ssr: false,
});

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xa06De09Fe301055f93547FbEDb7F9c28203C574D";
export const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS || "0xcb8bf24c6ce16ad21d707c9505421a17f2bec79d";
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const ORACULO_ABI = [
  {"inputs":[{"name":"amount","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"marketId","type":"uint256"},{"name":"side","type":"uint8"},{"name":"amount","type":"uint256"}],"name":"placeBet","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"betIndex","type":"uint256"}],"name":"claimWinnings","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"marketId","type":"uint256"}],"name":"getMarket","outputs":[{"components":[{"name":"id","type":"uint256"},{"name":"question","type":"string"},{"name":"confidencePct","type":"uint8"},{"name":"status","type":"uint8"},{"name":"agentCorrect","type":"bool"},{"name":"createdAt","type":"uint256"},{"name":"resolveBy","type":"uint256"},{"name":"poolWith","type":"uint256"},{"name":"poolAgainst","type":"uint256"}],"name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getAllMarkets","outputs":[{"components":[{"name":"id","type":"uint256"},{"name":"question","type":"string"},{"name":"confidencePct","type":"uint8"},{"name":"status","type":"uint8"},{"name":"agentCorrect","type":"bool"},{"name":"createdAt","type":"uint256"},{"name":"resolveBy","type":"uint256"},{"name":"poolWith","type":"uint256"},{"name":"poolAgainst","type":"uint256"}],"name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"user","type":"address"}],"name":"getUserBets","outputs":[{"components":[{"name":"marketId","type":"uint256"},{"name":"side","type":"uint8"},{"name":"amount","type":"uint256"},{"name":"claimed","type":"bool"}],"name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"user","type":"address"}],"name":"getUserBalance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"marketId","type":"uint256"}],"name":"getOdds","outputs":[{"name":"withOdds","type":"uint256"},{"name":"againstOdds","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"marketCount","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"withdrawFees","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"accruedFees","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"FEE_BPS","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

export const USDC_ABI = [
  {
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
];