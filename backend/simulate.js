import "dotenv/config";
import axios from "axios";
import Groq from "groq-sdk";
import { getAllMarkets, resolveMarket } from "./chain.js";

// Before
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const FOOTBALL_API_BASE = "https://v3.football.api-sports.io";
const FOOTBALL_HEADERS = {
  "x-apisports-key": FOOTBALL_API_KEY,
};

// World Cup 2026 league ID (FIFA World Cup = 1 on api-football)
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

// ─── Season fallback chain ────────────────────────────────────────────────────
// Ordered from most recent to oldest. We'll walk this list until we find data.
const FALLBACK_SEASONS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

// Top leagues to try when no WC data exists for a player
const FALLBACK_LEAGUES = [
  { id: 2,   name: "Champions League" },
  { id: 3,   name: "Europa League" },
  { id: 39,  name: "Premier League" },
  { id: 140, name: "La Liga" },
  { id: 61,  name: "Ligue 1" },
  { id: 78,  name: "Bundesliga" },
  { id: 135, name: "Serie A" },
  { id: 94,  name: "Primeira Liga" },
  { id: 88,  name: "Eredivisie" },
  { id: 203, name: "Turkish Süper Lig" },
  { id: 307, name: "Saudi Pro League" },
];

// ─── Fetch team stats with season fallback ────────────────────────────────────

async function getTeamStats(teamName) {
  // 1. Try WC seasons first (2026, 2022, 2018, 2014)
  const wcSeasons = [2026, 2022, 2018, 2014];
  for (const season of wcSeasons) {
    try {
      const teamRes = await axios.get(`${FOOTBALL_API_BASE}/teams`, {
        headers: FOOTBALL_HEADERS,
        params: { name: teamName, league: WC_LEAGUE_ID, season },
      });

      const team = teamRes.data?.response?.[0];
      if (!team) continue;

      const statsRes = await axios.get(`${FOOTBALL_API_BASE}/teams/statistics`, {
        headers: FOOTBALL_HEADERS,
        params: { team: team.team.id, league: WC_LEAGUE_ID, season },
      });

      const stats = statsRes.data?.response;
      if (!stats) continue;

      return {
        name: team.team.name,
        id: team.team.id,
        form: stats.form || "N/A",
        goalsFor: stats.goals?.for?.total?.total || 0,
        goalsAgainst: stats.goals?.against?.total?.total || 0,
        wins: stats.fixtures?.wins?.total || 0,
        draws: stats.fixtures?.draws?.total || 0,
        losses: stats.fixtures?.loses?.total || 0,
        cleanSheets: stats.clean_sheet?.total || 0,
        dataSource: `World Cup ${season}`,
      };
    } catch (err) {
      console.error(`Team stats error for ${teamName} (WC ${season}):`, err.message);
    }
  }

  // 2. Try qualifier / international campaigns across recent seasons
  const intlLeagues = [
    { id: 4,   name: "Euro Championship" },
    { id: 5,   name: "UEFA Nations League" },
    { id: 6,   name: "Africa Cup of Nations" },
    { id: 7,   name: "Copa America" },
    { id: 10,  name: "FIFA Friendlies" },
    { id: 32,  name: "World Cup Qualifiers - Europe" },
    { id: 33,  name: "World Cup Qualifiers - South America" },
    { id: 34,  name: "World Cup Qualifiers - Africa" },
  ];

  for (const season of FALLBACK_SEASONS) {
    for (const league of intlLeagues) {
      try {
        const teamRes = await axios.get(`${FOOTBALL_API_BASE}/teams`, {
          headers: FOOTBALL_HEADERS,
          params: { name: teamName, league: league.id, season },
        });

        const team = teamRes.data?.response?.[0];
        if (!team) continue;

        const statsRes = await axios.get(`${FOOTBALL_API_BASE}/teams/statistics`, {
          headers: FOOTBALL_HEADERS,
          params: { team: team.team.id, league: league.id, season },
        });

        const stats = statsRes.data?.response;
        if (!stats) continue;

        return {
          name: team.team.name,
          id: team.team.id,
          form: stats.form || "N/A",
          goalsFor: stats.goals?.for?.total?.total || 0,
          goalsAgainst: stats.goals?.against?.total?.total || 0,
          wins: stats.fixtures?.wins?.total || 0,
          draws: stats.fixtures?.draws?.total || 0,
          losses: stats.fixtures?.loses?.total || 0,
          cleanSheets: stats.clean_sheet?.total || 0,
          dataSource: `${league.name} ${season}`,
        };
      } catch {}
    }
  }

  console.warn(`   ⚠️  No team stats found for ${teamName} across all fallback seasons.`);
  return null;
}

// ─── Fetch player stats with deep season + league fallback ────────────────────

async function getPlayerStats(playerName) {
  // 1. Try World Cup 2026 first
  try {
    const res = await axios.get(`${FOOTBALL_API_BASE}/players`, {
      headers: FOOTBALL_HEADERS,
      params: { search: playerName, league: WC_LEAGUE_ID, season: WC_SEASON },
    });
    const player = res.data?.response?.[0];
    if (player) {
      const extracted = extractPlayerStats(player);
      if (extracted) {
        return { ...extracted, dataSource: `World Cup ${WC_SEASON}` };
      }
    }
  } catch (err) {
    console.error(`Player stats error for ${playerName} (WC 2026):`, err.message);
  }

  // 2. Walk back through seasons × leagues until we find something
  for (const season of FALLBACK_SEASONS) {
    // Try WC first for each historical season (2022, 2018 etc.)
    if (season !== WC_SEASON) {
      try {
        const res = await axios.get(`${FOOTBALL_API_BASE}/players`, {
          headers: FOOTBALL_HEADERS,
          params: { search: playerName, league: WC_LEAGUE_ID, season },
        });
        const player = res.data?.response?.[0];
        if (player) {
          const extracted = extractPlayerStats(player);
          if (extracted) {
            return { ...extracted, dataSource: `World Cup ${season}` };
          }
        }
      } catch {}
    }

    // Try club leagues for this season
    for (const league of FALLBACK_LEAGUES) {
      try {
        const res = await axios.get(`${FOOTBALL_API_BASE}/players`, {
          headers: FOOTBALL_HEADERS,
          params: { search: playerName, league: league.id, season },
        });
        const player = res.data?.response?.[0];
        if (player) {
          const extracted = extractPlayerStats(player);
          if (extracted) {
            return { ...extracted, dataSource: `${league.name} ${season}` };
          }
        }
      } catch {}

      // Small delay to respect rate limits
      await new Promise(r => setTimeout(r, 150));
    }
  }

  console.warn(`   ⚠️  No player stats found for ${playerName} across all fallback seasons/leagues.`);
  return null;
}

function extractPlayerStats(player) {
  const stats = player.statistics?.[0];
  if (!stats) return null;

  const goals = stats.goals?.total || 0;
  const appearances = stats.games?.appearences || 0;

  return {
    name: player.player.name,
    age: player.player.age,
    nationality: player.player.nationality,
    rating: stats.games?.rating || "N/A",
    appearances,
    goals,
    assists: stats.goals?.assists || 0,
    goalsPerGame: appearances > 0 ? (goals / appearances).toFixed(2) : "0.00",
    passAccuracy: stats.passes?.accuracy || "N/A",
    yellowCards: stats.cards?.yellow || 0,
    redCards: stats.cards?.red || 0,
    injuryProne: (stats.cards?.yellow || 0) > 5,
    dataSource: null, // filled by caller
  };
}

// ─── Extract entities from question ──────────────────────────────────────────

const KNOWN_PLAYERS = [
  "Mbappe", "Mbappé", "Messi", "Ronaldo", "Neymar", "Salah", "Haaland",
  "Vinicius", "Vini Jr", "Benzema", "Lewandowski", "Kane", "Modric", "Modrić",
  "Fernandes", "Rashford", "Saka", "Bellingham", "Pedri", "Yamal", "Lamine",
  "Osimhen", "Musiala", "Wirtz", "Havertz", "Kimmich", "Gavi", "Griezmann",
  "De Bruyne", "Lukaku", "De Jong", "Gakpo", "Depay", "Valverde",
  "Darwin Nunez", "Pulisic", "Son", "Mitoma", "Kubo", "Hakimi", "Ziyech",
  "En-Nesyri", "Vlahovic", "Eriksen", "Hojlund", "Kudus", "Mahrez",
  "Isak", "Dybala", "Lautaro", "Mac Allister", "De Paul", "Joao Felix",
  "Diogo Jota", "Bernardo Silva", "Cancelo", "Leao", "Endrick", "Richarlison",
  "Raphinha", "Rodrygo", "Casemiro", "Camavinga", "Tchouameni", "Thuram",
];

const KNOWN_TEAMS = [
  "Brazil", "Argentina", "France", "England", "Germany", "Spain", "Portugal",
  "Netherlands", "Belgium", "Croatia", "Morocco", "Nigeria", "Senegal",
  "USA", "Mexico", "Japan", "South Korea", "Australia", "Uruguay", "Colombia",
  "Ecuador", "Chile", "Peru", "Switzerland", "Denmark", "Sweden", "Poland",
  "Serbia", "Ghana", "Egypt", "Cameroon", "Ivory Coast", "Algeria", "Tunisia",
  "Saudi Arabia", "Iran", "Canada", "Qatar", "Wales",
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

  for (const playerName of players.slice(0, 2)) {
    console.log(`   🔍 Fetching stats for player: ${playerName}...`);
    const stats = await getPlayerStats(playerName);
    if (stats) {
      console.log(`   ✅ Found ${playerName} data from: ${stats.dataSource}`);
      lines.push(`
PLAYER: ${stats.name} (${stats.nationality}, age ${stats.age}) [Source: ${stats.dataSource}]
- Rating: ${stats.rating}/10
- Appearances: ${stats.appearances} | Goals: ${stats.goals} | Assists: ${stats.assists}
- Goals per game: ${stats.goalsPerGame}
- Pass accuracy: ${stats.passAccuracy}%
- Yellow cards: ${stats.yellowCards} | Red cards: ${stats.redCards}
- Injury prone: ${stats.injuryProne ? "Yes (5+ yellows)" : "No"}
      `.trim());
    }
  }

  for (const teamName of teams.slice(0, 2)) {
    console.log(`   🔍 Fetching stats for team: ${teamName}...`);
    const stats = await getTeamStats(teamName);
    if (stats) {
      console.log(`   ✅ Found ${teamName} data from: ${stats.dataSource}`);
      lines.push(`
TEAM: ${stats.name} [Source: ${stats.dataSource}]
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

  if (statsContext) {
    console.log("   📊 Historical stats found — using AI + data decision...");
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You are simulating World Cup 2026 outcomes for a prediction market testnet.
You have been given historical player/team statistics which may come from past World Cups, club seasons, or international tournaments.
Use these stats to make an informed prediction about whether the oracle's prediction would likely come true at the 2026 World Cup.
The oracle always predicts YES / the positive outcome.
Note: stats may be from older seasons — factor in player age, trajectory, and historical performance trends.
Respond ONLY with valid JSON: { "agentCorrect": true | false, "reason": "one sentence referencing the stats and data source" }
No markdown, no extra text.`,
          },
          {
            role: "user",
            content: `Market question: "${question}"\n\nHistorical statistics:\n${statsContext}\n\nBased on these historical stats, would the oracle's prediction likely come true at the 2026 World Cup?`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return {
        agentCorrect: parsed.agentCorrect ?? (confidencePct >= 60),
        reason: parsed.reason || "Decided based on historical stats.",
        usedRealStats: true,
        statsContext,
      };
    } catch (err) {
      console.error("   ⚠️  AI decision failed, falling back to confidence:", err.message);
    }
  }

  // Final fallback: confidence-based decision
  console.log("   📊 No stats found across any season — using confidence score...");
  const confidence = Number(confidencePct) || 50;
  const agentCorrect = confidence >= 60;
  return {
    agentCorrect,
    reason: agentCorrect
      ? `Oracle confidence was ${confidence}% — high enough, prediction holds.`
      : `Oracle confidence was only ${confidence}% — too low, prediction failed.`,
    usedRealStats: false,
    statsContext: null,
  };
}

// ─── Main simulation ──────────────────────────────────────────────────────────

async function runSimulation() {
  console.log("\n🌍 ORÁCULO TESTNET SIMULATION (Deep Historical Stats Mode)\n");
  console.log(`📅 Season fallback chain: ${FALLBACK_SEASONS.join(" → ")}`);
  console.log(`🏆 League fallback chain: ${FALLBACK_LEAGUES.map(l => l.name).join(", ")}\n`);

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

    const { agentCorrect, reason, usedRealStats, statsContext } = await decideOutcome(market.question, market.confidencePct);

    console.log(`   📣 Result: Oracle was ${agentCorrect ? "✅ CORRECT" : "❌ WRONG"}`);
    console.log(`   💬 ${reason}`);
    console.log(`   📊 Decision based on: ${usedRealStats ? "Historical player/team stats" : "Confidence score fallback"}`);
    if (statsContext) {
      console.log(`   📁 Stats used:\n${statsContext.split("\n").map(l => `      ${l}`).join("\n")}`);
    }
    console.log("   ⛓  Resolving on-chain...");

    const result = await resolveMarket(market.id, agentCorrect);

    if (result.success) {
      console.log(`   ✅ Resolved! Tx: ${result.txHash}`);
      console.log(`   🏆 Winners: bets placed "${agentCorrect ? "With" : "Against"}" the oracle\n`);
    } else {
      console.log(`   ❌ Failed: ${result.error}\n`);
    }

    // Pause between markets to be kind to rate limits
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log("Simulation complete. Winners can now claim payouts on the My Bets page.\n");
}

runSimulation().catch(console.error);