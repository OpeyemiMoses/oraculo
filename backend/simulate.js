import "dotenv/config";
import axios from "axios";
import Groq from "groq-sdk";
import { getAllMarkets, resolveMarket } from "./chain.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const FOOTBALL_API_BASE = "https://v3.football.api-sports.io";
const FOOTBALL_HEADERS = {
  "x-apisports-key": FOOTBALL_API_KEY,
};

// World Cup 2026 league ID (FIFA World Cup = 1 on api-football)
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

// ─── Fetch team stats ─────────────────────────────────────────────────────────

async function getTeamStats(teamName) {
  try {
    // Search for team
    const teamRes = await axios.get(`${FOOTBALL_API_BASE}/teams`, {
      headers: FOOTBALL_HEADERS,
      params: { name: teamName, league: WC_LEAGUE_ID, season: WC_SEASON },
    });

    const team = teamRes.data?.response?.[0];
    if (!team) return null;

    const teamId = team.team.id;

    // Get team statistics
    const statsRes = await axios.get(`${FOOTBALL_API_BASE}/teams/statistics`, {
      headers: FOOTBALL_HEADERS,
      params: { team: teamId, league: WC_LEAGUE_ID, season: WC_SEASON },
    });

    const stats = statsRes.data?.response;
    if (!stats) return null;

    return {
      name: team.team.name,
      id: teamId,
      form: stats.form || "N/A",
      goalsFor: stats.goals?.for?.total?.total || 0,
      goalsAgainst: stats.goals?.against?.total?.total || 0,
      wins: stats.fixtures?.wins?.total || 0,
      draws: stats.fixtures?.draws?.total || 0,
      losses: stats.fixtures?.loses?.total || 0,
      cleanSheets: stats.clean_sheet?.total || 0,
    };
  } catch (err) {
    console.error(`Team stats error for ${teamName}:`, err.message);
    return null;
  }
}

// ─── Fetch player stats ───────────────────────────────────────────────────────

async function getPlayerStats(playerName) {
  try {
    const res = await axios.get(`${FOOTBALL_API_BASE}/players`, {
      headers: FOOTBALL_HEADERS,
      params: { search: playerName, league: WC_LEAGUE_ID, season: WC_SEASON },
    });

    const player = res.data?.response?.[0];
    if (!player) {
      // Fallback: search by name without league filter
      const fallback = await axios.get(`${FOOTBALL_API_BASE}/players`, {
        headers: FOOTBALL_HEADERS,
        params: { search: playerName, season: 2024 },
      });
      const p = fallback.data?.response?.[0];
      if (!p) return null;
      return extractPlayerStats(p);
    }

    return extractPlayerStats(player);
  } catch (err) {
    console.error(`Player stats error for ${playerName}:`, err.message);
    return null;
  }
}

function extractPlayerStats(player) {
  const stats = player.statistics?.[0];
  if (!stats) return null;
  return {
    name: player.player.name,
    age: player.player.age,
    nationality: player.player.nationality,
    rating: stats.games?.rating || "N/A",
    appearances: stats.games?.appearences || 0,
    goals: stats.goals?.total || 0,
    assists: stats.goals?.assists || 0,
    goalsPerGame: stats.games?.appearences
      ? ((stats.goals?.total || 0) / stats.games.appearences).toFixed(2)
      : "0.00",
    passAccuracy: stats.passes?.accuracy || "N/A",
    yellowCards: stats.cards?.yellow || 0,
    redCards: stats.cards?.red || 0,
    injuryProne: (stats.cards?.yellow || 0) > 5,
  };
}

// ─── Extract entities from question ──────────────────────────────────────────

const KNOWN_PLAYERS = [
  "Mbappe", "Messi", "Ronaldo", "Neymar", "Salah", "Haaland", "Vinicius",
  "Benzema", "Lewandowski", "Kane", "Modric", "Fernandes", "Rashford",
  "Saka", "Bellingham", "Pedri", "Yamal", "Osimhen", "Musiala", "Wirtz"
];

const KNOWN_TEAMS = [
  "Brazil", "Argentina", "France", "England", "Germany", "Spain", "Portugal",
  "Netherlands", "Belgium", "Croatia", "Morocco", "Nigeria", "Senegal",
  "USA", "Mexico", "Japan", "South Korea", "Australia", "Uruguay", "Colombia"
];

function extractEntities(question) {
  const q = question.toLowerCase();
  const players = KNOWN_PLAYERS.filter(p => q.includes(p.toLowerCase()));
  const teams = KNOWN_TEAMS.filter(t => q.includes(t.toLowerCase()));
  return { players, teams };
}

// ─── Build stats context ──────────────────────────────────────────────────────

async function buildStatsContext(question) {
  const { players, teams } = extractEntities(question);
  const lines = [];

  // Fetch player stats
  for (const playerName of players.slice(0, 2)) {
    const stats = await getPlayerStats(playerName);
    if (stats) {
      lines.push(`
PLAYER: ${stats.name} (${stats.nationality}, age ${stats.age})
- Rating: ${stats.rating}/10
- Appearances: ${stats.appearances} | Goals: ${stats.goals} | Assists: ${stats.assists}
- Goals per game: ${stats.goalsPerGame}
- Pass accuracy: ${stats.passAccuracy}%
- Yellow cards: ${stats.yellowCards} | Red cards: ${stats.redCards}
- Injury prone: ${stats.injuryProne ? "Yes (5+ yellows)" : "No"}
      `.trim());
    }
  }

  // Fetch team stats
  for (const teamName of teams.slice(0, 2)) {
    const stats = await getTeamStats(teamName);
    if (stats) {
      lines.push(`
TEAM: ${stats.name}
- Recent form: ${stats.form}
- Goals scored: ${stats.goalsFor} | Goals conceded: ${stats.goalsAgainst}
- Record: W${stats.wins} D${stats.draws} L${stats.losses}
- Clean sheets: ${stats.cleanSheets}
      `.trim());
    }
  }

  return lines.length > 0 ? lines.join("\n\n") : null;
}

// ─── AI decision with real stats ─────────────────────────────────────────────

async function decideOutcome(question, confidencePct) {
  const statsContext = await buildStatsContext(question);

  // If we got real stats, use AI to decide based on them
  if (statsContext) {
    console.log("   📊 Real stats found — using AI + data decision...");
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 150,
        messages: [
          {
            role: "system",
            content: `You are simulating World Cup 2026 outcomes for a prediction market testnet.
Based on the real player/team statistics provided, decide if the oracle's prediction came true.
The oracle always predicts YES / the positive outcome.
Respond ONLY with valid JSON: { "agentCorrect": true | false, "reason": "one sentence using the stats" }
No markdown, no extra text.`,
          },
          {
            role: "user",
            content: `Market question: "${question}"\n\nReal statistics:\n${statsContext}\n\nBased on these real stats, did the oracle's prediction come true?`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return {
        agentCorrect: parsed.agentCorrect ?? (confidencePct >= 60),
        reason: parsed.reason || "Decided based on real stats.",
        usedRealStats: true,
      };
    } catch {
      // Fall through to confidence-based
    }
  }

  // Fallback: confidence-based decision
  console.log("   📊 No real stats found — using confidence score...");
  const confidence = Number(confidencePct) || 50;
  const agentCorrect = confidence >= 60;
  return {
    agentCorrect,
    reason: agentCorrect
      ? `Oracle confidence was ${confidence}% — high enough, prediction holds.`
      : `Oracle confidence was only ${confidence}% — too low, prediction failed.`,
    usedRealStats: false,
  };
}

// ─── Main simulation ──────────────────────────────────────────────────────────

async function runSimulation() {
  console.log("\n🌍 ORÁCULO TESTNET SIMULATION (Real Stats Mode)\n");

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

    const totalPool = parseFloat(market.poolWith) + parseFloat(market.poolAgainst);
    if (totalPool === 0) {
      console.log("   ⏭  Skipping — no bets placed.\n");
      continue;
    }

    const marketAge = now - market.createdAt;
    const hoursOld = Math.floor(marketAge / 3600);
    if (marketAge < 60 * 60 * 24) {
      console.log(`   ⏳ Too early — market is only ${hoursOld}h old. Skipping until 24h passed.\n`);
      continue;
    }

    const { agentCorrect, reason, usedRealStats } = await decideOutcome(market.question, market.confidencePct);

    console.log(`   📣 Result: Oracle was ${agentCorrect ? "✅ CORRECT" : "❌ WRONG"}`);
    console.log(`   💬 ${reason}`);
    console.log(`   📊 Decision based on: ${usedRealStats ? "Real player/team stats" : "Confidence score fallback"}`);
    console.log("   ⛓  Resolving on-chain...");

    const result = await resolveMarket(market.id, agentCorrect);

    if (result.success) {
      console.log(`   ✅ Resolved! Tx: ${result.txHash}`);
      console.log(`   🏆 Winners: bets placed "${agentCorrect ? "With" : "Against"}" the oracle\n`);
    } else {
      console.log(`   ❌ Failed: ${result.error}\n`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("Simulation complete. Winners can now claim payouts on the My Bets page.\n");
}

runSimulation().catch(console.error);