import "dotenv/config";
import fs from "fs";
import express from "express";
import cors from "cors";
import axios from "axios";
import Groq from "groq-sdk";
import { askAgent } from "./agent.js";
import { createMarket, resolveMarket, cancelMarket, getAllMarkets, getMarket, getUserBets, getUserBalance } from "./chain.js";

const app = express();
app.use(cors({
  origin: [
    "https://oraculo-green.vercel.app",
    "https://oraculo-2mk9coetd-yemigraffixs-projects.vercel.app",
    "http://localhost:5173"
  ]
}));
app.use(express.json());

const XLAYER_EXPLORER = "https://www.oklink.com/xlayer-test";

// ─── Persistent Storage ───────────────────────────────────────────────────────

const STORAGE_FILE = "./market-data.json";

function loadStorage() {
  try {
    if (fs.existsSync(STORAGE_FILE)) return JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));
  } catch {}
  return {};
}

function saveStorage(data) {
  try { fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2)); } catch {}
}

let marketAnalysis = loadStorage();

// ─── Duplicate Detection ──────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "will", "the", "2026", "world", "cup", "during", "have", "this",
  "that", "with", "from", "for", "and", "but", "not", "are", "was",
  "his", "her", "their", "team", "game", "match", "player",
  "messi", "ronaldo", "neymar", "mbappe", "score", "play", "win"
]);

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function similarity(a, b) {
  const wordsA = new Set(normalize(a).split(" ").filter(w => w.length > 3 && !STOPWORDS.has(w)));
  const wordsB = new Set(normalize(b).split(" ").filter(w => w.length > 3 && !STOPWORDS.has(w)));
  if (!wordsA.size || !wordsB.size) return 0;
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  return intersection / Math.max(wordsA.size, wordsB.size);
}

// ─── Auto-Scheduler: Stats + Resolution Logic ─────────────────────────────────

const FOOTBALL_API_BASE = "https://v3.football.api-sports.io";
const FOOTBALL_HEADERS = { "x-apisports-key": process.env.FOOTBALL_API_KEY };

const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

const FALLBACK_SEASONS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];
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

const KNOWN_PLAYERS = [
  // France
  "Mbappe", "Mbappé", "Griezmann", "Thuram", "Camavinga", "Tchouameni", "Maignan", "Saliba", "Dembele", "Kante", "Kanté",
  // Argentina
  "Messi", "Di Maria", "Dybala", "Lautaro", "Mac Allister", "De Paul", "Molina", "Acuña",
  // Portugal
  "Ronaldo", "Bernardo Silva", "Joao Felix", "Diogo Jota", "Cancelo", "Leao", "Bruno Fernandes", "Vitinha", "Ruben Dias",
  // England
  "Kane", "Bellingham", "Saka", "Rashford", "Foden", "Rice", "Grealish", "Trippier", "Pickford",
  // Germany
  "Musiala", "Wirtz", "Havertz", "Kimmich", "Kroos", "Gundogan", "Gündogan", "Rudiger", "Rüdiger", "Neuer",
  // Spain
  "Pedri", "Gavi", "Yamal", "Lamine", "Morata", "Olmo", "Rodri", "Laporte",
  // Brazil
  "Neymar", "Vinicius", "Vini Jr", "Rodrygo", "Raphinha", "Richarlison", "Casemiro", "Endrick", "Alisson", "Marquinhos",
  // Netherlands
  "Van Dijk", "De Jong", "Gakpo", "Depay", "Dumfries", "Frimpong",
  // Belgium
  "De Bruyne", "Lukaku", "Tielemans", "Doku",
  // Croatia
  "Modric", "Modrić", "Gvardiol", "Brozovic", "Kramaric",
  // Morocco
  "Hakimi", "Ziyech", "Amrabat", "En-Nesyri", "Ounahi", "Mazraoui",
  // Senegal
  "Mane", "Mané", "Koulibaly", "Ismaila Sarr", "Gueye",
  // Egypt
  "Salah", "Mo Salah", "Marmoush",
  // Algeria
  "Mahrez", "Bennacer", "Aouar",
  // Ivory Coast
  "Zaha", "Kessie", "Haller",
  // Ghana
  "Kudus", "Partey", "Ayew",
  // Japan
  "Mitoma", "Kubo", "Endo", "Kamada", "Tomiyasu",
  // South Korea
  "Son", "Son Heung-min", "Kim Min-Jae", "Lee Kang-In",
  // Norway
  "Haaland", "Odegaard", "Ødegaard", "Isak", "Sorloth",
  // Colombia
  "James", "Luis Diaz", "Falcao", "Cuadrado",
  // Uruguay
  "Valverde", "Darwin Nunez", "Cavani", "Suarez", "Bentancur",
  // Ecuador
  "Enner Valencia", "Plata",
  // Paraguay
  "Almiron", "Almirón", "Sanabria",
  // Turkey
  "Calhanoglu", "Çalhanoğlu", "Guler", "Güler", "Yildiz",
  // Austria
  "Alaba", "Sabitzer", "Arnautovic",
  // Switzerland
  "Xhaka", "Shaqiri", "Akanji", "Embolo",
  // Sweden
  "Forsberg",
  // Bosnia
  "Dzeko", "Džeko", "Pjanic", "Pjanić",
  // Scotland
  "Robertson", "McTominay", "Adams",
  // Iran
  "Taremi", "Azmoun", "Jahanbakhsh",
  // Curaçao
  "Kluivert",
];

// ── 2026 FIFA World Cup Qualified Teams ─────────────────────────────────────
const KNOWN_TEAMS = [
  // Hosts
  "United States", "USA", "Canada", "Mexico",
  // CAF
  "Algeria", "Cape Verde", "Ivory Coast", "Egypt", "Ghana",
  "Morocco", "Senegal", "South Africa", "Tunisia", "DR Congo",
  // AFC
  "Australia", "Iran", "Japan", "Jordan", "South Korea",
  "Qatar", "Saudi Arabia", "Uzbekistan", "Iraq",
  // UEFA
  "Austria", "Belgium", "Bosnia and Herzegovina", "Croatia",
  "Czech Republic", "England", "France", "Germany", "Netherlands",
  "Norway", "Portugal", "Scotland", "Spain", "Sweden", "Switzerland", "Turkey",
  // CONCACAF
  "Curaçao", "Curacao", "Haiti", "Panama",
  // CONMEBOL
  "Argentina", "Brazil", "Colombia", "Ecuador", "Paraguay", "Uruguay",
  // OFC
  "New Zealand",
];

function extractEntities(question) {
  const q = question.toLowerCase();
  return {
    players: KNOWN_PLAYERS.filter(p => q.includes(p.toLowerCase())),
    teams:   KNOWN_TEAMS.filter(t => q.includes(t.toLowerCase())),
  };
}

function extractPlayerStats(player) {
  const stats = player.statistics?.[0];
  if (!stats) return null;
  const goals = stats.goals?.total || 0;
  const appearances = stats.games?.appearences || 0;
  return {
    name:         player.player.name,
    age:          player.player.age,
    nationality:  player.player.nationality,
    rating:       stats.games?.rating || "N/A",
    appearances,
    goals,
    assists:      stats.goals?.assists || 0,
    goalsPerGame: appearances > 0 ? (goals / appearances).toFixed(2) : "0.00",
    passAccuracy: stats.passes?.accuracy || "N/A",
    yellowCards:  stats.cards?.yellow || 0,
    redCards:     stats.cards?.red || 0,
    injuryProne:  (stats.cards?.yellow || 0) > 5,
    dataSource:   null,
  };
}

async function getPlayerStats(playerName) {
  // 1. Try WC 2026
  try {
    const res = await axios.get(`${FOOTBALL_API_BASE}/players`, {
      headers: FOOTBALL_HEADERS,
      params: { search: playerName, league: WC_LEAGUE_ID, season: WC_SEASON },
    });
    const player = res.data?.response?.[0];
    if (player) {
      const extracted = extractPlayerStats(player);
      if (extracted) return { ...extracted, dataSource: `World Cup ${WC_SEASON}` };
    }
  } catch {}

  // 2. Walk back through seasons × leagues
  for (const season of FALLBACK_SEASONS) {
    if (season !== WC_SEASON) {
      try {
        const res = await axios.get(`${FOOTBALL_API_BASE}/players`, {
          headers: FOOTBALL_HEADERS,
          params: { search: playerName, league: WC_LEAGUE_ID, season },
        });
        const player = res.data?.response?.[0];
        if (player) {
          const extracted = extractPlayerStats(player);
          if (extracted) return { ...extracted, dataSource: `World Cup ${season}` };
        }
      } catch {}
    }

    for (const league of FALLBACK_LEAGUES) {
      try {
        const res = await axios.get(`${FOOTBALL_API_BASE}/players`, {
          headers: FOOTBALL_HEADERS,
          params: { search: playerName, league: league.id, season },
        });
        const player = res.data?.response?.[0];
        if (player) {
          const extracted = extractPlayerStats(player);
          if (extracted) return { ...extracted, dataSource: `${league.name} ${season}` };
        }
      } catch {}
      await new Promise(r => setTimeout(r, 150));
    }
  }
  return null;
}

async function getTeamStats(teamName) {
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
        name:         team.team.name,
        form:         stats.form || "N/A",
        goalsFor:     stats.goals?.for?.total?.total || 0,
        goalsAgainst: stats.goals?.against?.total?.total || 0,
        wins:         stats.fixtures?.wins?.total || 0,
        draws:        stats.fixtures?.draws?.total || 0,
        losses:       stats.fixtures?.loses?.total || 0,
        cleanSheets:  stats.clean_sheet?.total || 0,
        dataSource:   `World Cup ${season}`,
      };
    } catch {}
  }

  const intlLeagues = [
    { id: 4,  name: "Euro Championship" }, { id: 5,  name: "UEFA Nations League" },
    { id: 6,  name: "Africa Cup of Nations" }, { id: 7, name: "Copa America" },
    { id: 10, name: "FIFA Friendlies" },
    { id: 32, name: "WC Qualifiers Europe" }, { id: 33, name: "WC Qualifiers S.America" },
    { id: 34, name: "WC Qualifiers Africa" },
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
          name:         team.team.name,
          form:         stats.form || "N/A",
          goalsFor:     stats.goals?.for?.total?.total || 0,
          goalsAgainst: stats.goals?.against?.total?.total || 0,
          wins:         stats.fixtures?.wins?.total || 0,
          draws:        stats.fixtures?.draws?.total || 0,
          losses:       stats.fixtures?.loses?.total || 0,
          cleanSheets:  stats.clean_sheet?.total || 0,
          dataSource:   `${league.name} ${season}`,
        };
      } catch {}
    }
  }
  return null;
}

async function buildStatsContext(question) {
  const { players, teams } = extractEntities(question);
  const lines = [];

  for (const playerName of players.slice(0, 2)) {
    const stats = await getPlayerStats(playerName);
    if (stats) {
      lines.push(
        `PLAYER: ${stats.name} (${stats.nationality}, age ${stats.age}) [Source: ${stats.dataSource}]\n` +
        `- Rating: ${stats.rating}/10 | Appearances: ${stats.appearances} | Goals: ${stats.goals} | Assists: ${stats.assists}\n` +
        `- Goals/game: ${stats.goalsPerGame} | Pass accuracy: ${stats.passAccuracy}% | YC: ${stats.yellowCards} | RC: ${stats.redCards}`
      );
    }
  }

  for (const teamName of teams.slice(0, 2)) {
    const stats = await getTeamStats(teamName);
    if (stats) {
      lines.push(
        `TEAM: ${stats.name} [Source: ${stats.dataSource}]\n` +
        `- Form: ${stats.form} | Goals F/A: ${stats.goalsFor}/${stats.goalsAgainst} | W${stats.wins} D${stats.draws} L${stats.losses} | CS: ${stats.cleanSheets}`
      );
    }
  }

  return lines.length > 0 ? lines.join("\n\n") : null;
}

async function decideOutcome(question, confidencePct) {
  const statsContext = await buildStatsContext(question);

  if (statsContext) {
    try {
      const groqDecider = new Groq({
        apiKey: process.env.GROQ_API_KEY,
        defaultHeaders: { "User-Agent": "Mozilla/5.0 (compatible; Oraculo/1.0)" },
      });
      const response = await groqDecider.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You are simulating World Cup 2026 outcomes for a prediction market testnet.
You have historical player/team statistics from past World Cups, club seasons, or international tournaments.
Use these stats to predict if the oracle's YES prediction would come true at the 2026 World Cup.
Factor in player age, trajectory, and historical performance trends.
Respond ONLY with valid JSON: { "agentCorrect": true | false, "reason": "one sentence referencing the stats and data source" }
No markdown, no extra text.`,
          },
          {
            role: "user",
            content: `Market question: "${question}"\n\nHistorical statistics:\n${statsContext}\n\nWould the oracle's prediction likely come true at the 2026 World Cup?`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      return {
        agentCorrect: parsed.agentCorrect ?? (Number(confidencePct) >= 60),
        reason:       parsed.reason || "Decided based on historical stats.",
        dataSource:   "Historical stats + AI",
      };
    } catch {}
  }

  // Final fallback: confidence score
  const confidence = Number(confidencePct) || 50;
  const agentCorrect = confidence >= 60;
  return {
    agentCorrect,
    reason: agentCorrect
      ? `Oracle confidence was ${confidence}% — high enough, prediction holds.`
      : `Oracle confidence was only ${confidence}% — too low, prediction failed.`,
    dataSource: "Confidence score fallback",
  };
}

// ─── Scheduler State ──────────────────────────────────────────────────────────

const SCHEDULER_INTERVAL_MS = 60 * 60 * 1000; // every 1 hour
const MARKET_MATURITY_S     = 60 * 60 * 24;   // 24 hours in seconds
let schedulerRunning = false;
let lastSchedulerRun = null;
let lastSchedulerLog = [];

async function runScheduler() {
  if (schedulerRunning) {
    console.log("[Scheduler] Already running — skipping this tick.");
    return;
  }

  schedulerRunning = true;
  lastSchedulerRun = new Date().toISOString();
  lastSchedulerLog = [];

  const log = (msg) => {
    console.log(`[Scheduler] ${msg}`);
    lastSchedulerLog.push(msg);
  };

  try {
    log("Checking open markets...");
    const markets = await getAllMarkets();
    const open = markets.filter(m => m.status === "Open");

    if (!open.length) {
      log("No open markets found.");
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const ready = open.filter(m => (now - m.createdAt) >= MARKET_MATURITY_S);
    const waiting = open.length - ready.length;

    log(`${open.length} open market(s) — ${ready.length} ready to resolve, ${waiting} still maturing.`);

    for (const market of ready) {
      const totalPool = parseFloat(market.poolWith) + parseFloat(market.poolAgainst);
      if (totalPool === 0) {
        log(`Market #${market.id} — skipping, no bets placed.`);
        continue;
      }

      log(`Market #${market.id}: "${market.question}" — resolving...`);

      const { agentCorrect, reason, dataSource } = await decideOutcome(market.question, market.confidencePct);

      log(`Market #${market.id} — Oracle ${agentCorrect ? "CORRECT ✅" : "WRONG ❌"} | ${reason} | Source: ${dataSource}`);

      const result = await resolveMarket(market.id, agentCorrect);

      if (result.success) {
        log(`Market #${market.id} — Resolved on-chain. Tx: ${result.txHash}. Winners: "${agentCorrect ? "With" : "Against"}"`);
        // Store resolution metadata
        marketAnalysis[`${market.id}_resolved`] = {
          resolvedAt: new Date().toISOString(),
          agentCorrect,
          reason,
          dataSource,
          txHash: result.txHash,
        };
        saveStorage(marketAnalysis);
      } else {
        log(`Market #${market.id} — Resolution failed: ${result.error}`);
      }

      // Pause between markets to respect rate limits
      await new Promise(r => setTimeout(r, 3000));
    }

    log("Scheduler run complete.");
  } catch (err) {
    console.error("[Scheduler] Unexpected error:", err.message);
    lastSchedulerLog.push(`ERROR: ${err.message}`);
  } finally {
    schedulerRunning = false;
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({
    status:          "ok",
    service:         "Oráculo API",
    scheduler: {
      lastRun:       lastSchedulerRun || "never",
      running:       schedulerRunning,
      intervalHours: SCHEDULER_INTERVAL_MS / 1000 / 3600,
      nextRunIn:     lastSchedulerRun
        ? `${Math.max(0, Math.round((SCHEDULER_INTERVAL_MS - (Date.now() - new Date(lastSchedulerRun).getTime())) / 60000))} min`
        : "on next tick",
    },
  });
});

// ─── Scheduler Status + Manual Trigger ───────────────────────────────────────

app.get("/scheduler/status", (req, res) => {
  res.json({
    running:       schedulerRunning,
    lastRun:       lastSchedulerRun || "never",
    lastLog:       lastSchedulerLog,
    intervalHours: SCHEDULER_INTERVAL_MS / 1000 / 3600,
    maturityHours: MARKET_MATURITY_S / 3600,
  });
});

app.post("/scheduler/run", async (req, res) => {
  const { adminKey } = req.body;
  if (adminKey !== process.env.ADMIN_KEY && adminKey !== process.env.PRIVATE_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ success: true, message: "Scheduler triggered manually. Check /scheduler/status for progress." });
  // Fire without awaiting so the response returns immediately
  runScheduler();
});

// ─── Ask ──────────────────────────────────────────────────────────────────────

app.post("/ask", async (req, res) => {
  const { question } = req.body;
  if (!question || question.trim().length < 5) return res.status(400).json({ error: "Question too short" });

  try {
    const agentResult = await askAgent(question);

    // ── PARTICIPATION_CHECK: factual roster question — never create a market ──
    if (agentResult.type === "PARTICIPATION_CHECK") {
      return res.json({
        success:         true,
        question,
        type:            "PARTICIPATION_CHECK",
        analysis:        agentResult.analysis,
        confidencePct:   0,
        canCreateMarket: false,
        marketQuestion:  null,
        detectedCountry: agentResult.detectedCountry || null,
        existingMarket:  null,
      });
    }

    let existingMarket = null;
    let carryOverConfidence = null;

    if (agentResult.canCreateMarket) {
      const allMarkets = await getAllMarkets();

      existingMarket = allMarkets.find(m =>
        (m.status === "Open" || m.status === "Resolved") &&
        similarity(m.question, agentResult.marketQuestion) >= 0.85
      ) || null;

      if (existingMarket) {
        carryOverConfidence = existingMarket.confidencePct;
        agentResult.canCreateMarket = false;
      }
    }

    return res.json({
      success:         true,
      question,
      type:            agentResult.type,
      analysis:        agentResult.analysis,
      confidencePct:   carryOverConfidence || agentResult.confidencePct,
      canCreateMarket: agentResult.canCreateMarket,
      marketQuestion:  agentResult.marketQuestion,
      detectedCountry: agentResult.detectedCountry || null,
      existingMarket:  existingMarket ? {
        id:            existingMarket.id,
        question:      existingMarket.question,
        confidencePct: existingMarket.confidencePct,
        status:        existingMarket.status,
        createdAt:     existingMarket.createdAt,
        explorerUrl:   `${XLAYER_EXPLORER}/address/${process.env.CONTRACT_ADDRESS}`,
        analysis:      marketAnalysis[existingMarket.id] || null,
      } : null,
    });
  } catch (err) {
    console.error("/ask error:", err);
    return res.status(500).json({ error: "Agent failed", detail: err.message });
  }
});

// ─── Create Market ────────────────────────────────────────────────────────────

app.post("/create-market", async (req, res) => {
  const { question, confidencePct, resolveBy, analysis, detectedCountry } = req.body;
  if (!question || !confidencePct) return res.status(400).json({ error: "Missing fields" });

  try {
    const marketResult = await createMarket(question, confidencePct, resolveBy || null);

    let market = null;
    if (marketResult.success && marketResult.marketId) {
      market = await getMarket(marketResult.marketId);
      if (analysis) { marketAnalysis[marketResult.marketId] = analysis; saveStorage(marketAnalysis); }
      if (detectedCountry) { marketAnalysis[`${marketResult.marketId}_country`] = detectedCountry; saveStorage(marketAnalysis); }
    }

    const enrichedMarket = market ? {
      ...market,
      explorerUrl:     `${XLAYER_EXPLORER}/address/${process.env.CONTRACT_ADDRESS}`,
      analysis:        analysis || null,
      detectedCountry: detectedCountry || null,
      question:        market.question || question,
      confidencePct:   market.confidencePct || confidencePct,
    } : {
      id:              marketResult.marketId,
      question,
      confidencePct,
      status:          "Open",
      agentCorrect:    false,
      createdAt:       Math.floor(Date.now() / 1000),
      resolveBy:       resolveBy || null,
      poolWith:        "0.0",
      poolAgainst:     "0.0",
      explorerUrl:     `${XLAYER_EXPLORER}/address/${process.env.CONTRACT_ADDRESS}`,
      analysis:        analysis || null,
      detectedCountry: detectedCountry || null,
    };

    return res.json({
      success:     marketResult.success,
      market:      enrichedMarket,
      txHash:      marketResult.txHash || null,
      marketId:    marketResult.marketId || null,
      explorerUrl: marketResult.txHash ? `${XLAYER_EXPLORER}/tx/${marketResult.txHash}` : null,
      error:       marketResult.error || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Markets ──────────────────────────────────────────────────────────────────

app.get("/markets", async (req, res) => {
  try {
    const markets = await getAllMarkets();
    const enriched = markets.map(m => ({
      ...m,
      explorerUrl:     `${XLAYER_EXPLORER}/address/${process.env.CONTRACT_ADDRESS}`,
      analysis:        marketAnalysis[m.id] || null,
      detectedCountry: marketAnalysis[`${m.id}_country`] || null,
      resolution:      marketAnalysis[`${m.id}_resolved`] || null,
    }));
    res.json({ success: true, markets: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/markets/:id", async (req, res) => {
  try {
    const market = await getMarket(req.params.id);
    if (!market) return res.status(404).json({ error: "Market not found" });
    res.json({
      success: true,
      market: {
        ...market,
        explorerUrl:     `${XLAYER_EXPLORER}/address/${process.env.CONTRACT_ADDRESS}`,
        analysis:        marketAnalysis[req.params.id] || null,
        detectedCountry: marketAnalysis[`${req.params.id}_country`] || null,
        resolution:      marketAnalysis[`${req.params.id}_resolved`] || null,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

app.post("/admin/resolve", async (req, res) => {
  const { marketId, agentCorrect, adminKey } = req.body;
  if (adminKey !== process.env.PRIVATE_KEY) return res.status(401).json({ error: "Unauthorized" });
  try { res.json(await resolveMarket(marketId, agentCorrect)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/admin/cancel", async (req, res) => {
  const { marketId, adminKey } = req.body;
  if (adminKey !== process.env.PRIVATE_KEY) return res.status(401).json({ error: "Unauthorized" });
  try { res.json(await cancelMarket(marketId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── User ─────────────────────────────────────────────────────────────────────

app.get("/user/:address/bets", async (req, res) => {
  try { res.json({ success: true, bets: await getUserBets(req.params.address) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/user/:address/balance", async (req, res) => {
  try { res.json({ success: true, balance: await getUserBalance(req.params.address) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Oráculo API running on port ${PORT}`);

  // Kick off the scheduler — first run after 5 min, then every hour
  setTimeout(() => {
    runScheduler();
    setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
  }, 5 * 60 * 1000);

  console.log(`[Scheduler] Auto-resolution active — checking markets every ${SCHEDULER_INTERVAL_MS / 1000 / 3600}h (first run in 5 min)`);
});