import { ethers } from "ethers";
import { ORACULO_ABI } from "./abi.js";

let provider;
let signer;
let contract;

function getContract() {
  if (!contract) {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ORACULO_ABI, signer);
  }
  return contract;
}

/**
 * Create a new market on-chain after an agent prediction.
 * resolveBy defaults to 24 hours from now if not specified.
 */
export async function createMarket(question, confidencePct, resolveByTimestamp) {
  const c = getContract();
  const resolveBy = resolveByTimestamp || Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h default

  try {
    const tx = await c.createMarket(question, confidencePct, resolveBy);
    const receipt = await tx.wait();

    // Parse MarketCreated event to get the marketId
    const event = receipt.logs
      .map((log) => {
        try { return c.interface.parseLog(log); } catch { return null; }
      })
      .find((e) => e && e.name === "MarketCreated");

    const marketId = event ? event.args.marketId.toString() : null;

    return {
      success: true,
      marketId,
      txHash: receipt.hash,
    };
  } catch (err) {
    console.error("createMarket error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Resolve a market — agentCorrect: true means agent was right
 */
export async function resolveMarket(marketId, agentCorrect) {
  const c = getContract();
  try {
    const tx = await c.resolveMarket(marketId, agentCorrect);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error("resolveMarket error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Cancel a market — refunds all bettors
 */
export async function cancelMarket(marketId) {
  const c = getContract();
  try {
    const tx = await c.cancelMarket(marketId);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error("cancelMarket error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Read all markets from chain
 */
export async function getAllMarkets() {
  const c = getContract();
  try {
    const markets = await c.getAllMarkets();
    return markets.map((m) => ({
      id:            m.id.toString(),
      question:      m.question,
      confidencePct: Number(m.confidencePct),
      status:        ["Open", "Resolved", "Cancelled"][Number(m.status)],
      agentCorrect:  m.agentCorrect,
      createdAt:     Number(m.createdAt),
      resolveBy:     Number(m.resolveBy),
      poolWith:      ethers.formatUnits(m.poolWith, 6),
      poolAgainst:   ethers.formatUnits(m.poolAgainst, 6),
    }));
  } catch (err) {
    console.error("getAllMarkets error:", err.message);
    return [];
  }
}

/**
 * Get a single market
 */
export async function getMarket(marketId) {
  const c = getContract();
  try {
    const m = await c.getMarket(marketId);
    return {
      id:            m.id.toString(),
      question:      m.question,
      confidencePct: Number(m.confidencePct),
      status:        ["Open", "Resolved", "Cancelled"][Number(m.status)],
      agentCorrect:  m.agentCorrect,
      createdAt:     Number(m.createdAt),
      resolveBy:     Number(m.resolveBy),
      poolWith:      ethers.formatUnits(m.poolWith, 6),
      poolAgainst:   ethers.formatUnits(m.poolAgainst, 6),
    };
  } catch (err) {
    console.error("getMarket error:", err.message);
    return null;
  }
}

/**
 * Get user bets
 */
export async function getUserBets(address) {
  const c = getContract();
  try {
    const bets = await c.getUserBets(address);
    return bets.map((b) => ({
      marketId: b.marketId.toString(),
      side:     Number(b.side) === 0 ? "With" : "Against",
      amount:   ethers.formatUnits(b.amount, 6),
      claimed:  b.claimed,
    }));
  } catch (err) {
    console.error("getUserBets error:", err.message);
    return [];
  }
}

/**
 * Get user's Oráculo USDC balance
 */
export async function getUserBalance(address) {
  const c = getContract();
  try {
    const bal = await c.getUserBalance(address);
    return ethers.formatUnits(bal, 6);
  } catch (err) {
    console.error("getUserBalance error:", err.message);
    return "0";
  }
}