import "dotenv/config";
import { getAllMarkets, resolveMarket } from "./chain.js";

function decideOutcome(question, confidencePct) {
  const confidence = Number(confidencePct) || 50;
  const agentCorrect = confidence >= 60;
  const reason = agentCorrect
    ? `Oracle confidence was ${confidence}% — high enough, prediction holds.`
    : `Oracle confidence was only ${confidence}% — too low, prediction failed.`;
  return { agentCorrect, reason };
}

async function runSimulation() {
  console.log("\n🌍 ORÁCULO TESTNET SIMULATION\n");

  if (!process.env.PRIVATE_KEY) {
    console.log("❌ PRIVATE_KEY not set in .env — cannot resolve markets.\n");
    process.exit(1);
  }

  const markets = await getAllMarkets();
  const open = markets.filter(m => m.status === "Open");

  if (!open.length) {
    console.log("No open markets to simulate. Create some first via the oracle.\n");
    return;
  }

  console.log(`Found ${open.length} open market(s):\n`);

  const now = Math.floor(Date.now() / 1000);

  for (const market of open) {
    console.log(`📋 Market #${market.id}: "${market.question}"`);
    console.log(`   Pool: ${market.poolWith} USDC (with) | ${market.poolAgainst} USDC (against)`);

    // Skip markets with no bets
    const totalPool = parseFloat(market.poolWith) + parseFloat(market.poolAgainst);
    if (totalPool === 0) {
      console.log("   ⏭  Skipping — no bets placed.\n");
      continue;
    }

    // Skip markets younger than 24 hours
    const marketAge = now - market.createdAt;
    const hoursOld = Math.floor(marketAge / 3600);
    if (marketAge < 60 * 60 * 24) {
      console.log(`   ⏳ Too early — market is only ${hoursOld}h old. Skipping until 24h passed.\n`);
      continue;
    }

    console.log("   🤖 Asking AI to simulate outcome...");
    const { agentCorrect, reason } = decideOutcome(market.question, market.confidencePct);

    console.log(`   📣 Result: Oracle was ${agentCorrect ? "✅ CORRECT" : "❌ WRONG"}`);
    console.log(`   💬 ${reason}`);
    console.log("   ⛓  Resolving on-chain...");

    const result = await resolveMarket(market.id, agentCorrect);

    if (result.success) {
      console.log(`   ✅ Resolved! Tx: ${result.txHash}`);
      console.log(`   🏆 Winners: bets placed "${agentCorrect ? "With" : "Against"}" the oracle\n`);
    } else {
      console.log(`   ❌ Failed: ${result.error}\n`);
    }

    // Small delay between resolutions to avoid nonce issues
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("Simulation complete. Winners can now claim payouts on the My Bets page.\n");
}

runSimulation().catch(console.error);