import axios from "axios";

const BASE = "https://api.football-data.org/v4";
const HEADERS = { "X-Auth-Token": process.env.FOOTBALL_API_KEY };

const WC_ID = process.env.FOOTBALL_WC_ID ? parseInt(process.env.FOOTBALL_WC_ID) : 2000;

const RAPID_BASE = "https://v3.football.api-sports.io";
const RAPID_HEADERS = { "x-apisports-key": process.env.FOOTBALL_API_KEY };

// ─── Tournament Prediction Cache ──────────────────────────────────────────────
// Computed once, stored in memory, reused forever (or until server restarts)

let tournamentCache = null;

// Country strength data — FIFA ranking points + key player OVRs
// These are baseline scores; FIFA rankings will update them if available
const COUNTRY_BASELINE = {
  fr:     { name: "France",               score: 95, players: ["Mbappe", "Griezmann"] },
  ar:     { name: "Argentina",            score: 94, players: ["Messi", "Lautaro"] },
  br:     { name: "Brazil",               score: 92, players: ["Vinicius", "Rodrygo"] },
  es:     { name: "Spain",                score: 91, players: ["Pedri", "Yamal"] },
  de:     { name: "Germany",              score: 88, players: ["Musiala", "Wirtz"] },
  pt:     { name: "Portugal",             score: 87, players: ["Ronaldo", "Bernardo Silva"] },
  "gb-eng": { name: "England",            score: 86, players: ["Kane", "Bellingham"] },
  nl:     { name: "Netherlands",          score: 84, players: ["Van Dijk", "Gakpo"] },
  be:     { name: "Belgium",              score: 82, players: ["De Bruyne", "Lukaku"] },
  hr:     { name: "Croatia",              score: 80, players: ["Modric", "Gvardiol"] },
  ma:     { name: "Morocco",              score: 78, players: ["Hakimi", "En-Nesyri"] },
  no:     { name: "Norway",               score: 77, players: ["Haaland", "Odegaard"] },
  uy:     { name: "Uruguay",              score: 76, players: ["Valverde", "Darwin Nunez"] },
  co:     { name: "Colombia",             score: 75, players: ["Luis Diaz", "James"] },
  us:     { name: "United States",        score: 72, players: ["Pulisic"] },
  mx:     { name: "Mexico",               score: 70, players: ["Lozano"] },
  sn:     { name: "Senegal",              score: 69, players: ["Mane"] },
  eg:     { name: "Egypt",               score: 68, players: ["Salah"] },
  jp:     { name: "Japan",                score: 67, players: ["Mitoma", "Kubo"] },
  kr:     { name: "South Korea",          score: 66, players: ["Son"] },
  se:     { name: "Sweden",               score: 65, players: ["Isak"] },
  ch:     { name: "Switzerland",          score: 64, players: ["Xhaka"] },
  tr:     { name: "Turkey",               score: 63, players: ["Guler", "Calhanoglu"] },
  at:     { name: "Austria",              score: 62, players: ["Alaba"] },
  ec:     { name: "Ecuador",              score: 60, players: ["Enner Valencia"] },
  au:     { name: "Australia",            score: 58, players: ["Leckie"] },
  ir:     { name: "Iran",                 score: 57, players: ["Taremi"] },
  dz:     { name: "Algeria",              score: 56, players: ["Mahrez"] },
  gh:     { name: "Ghana",                score: 55, players: ["Kudus"] },
  ci:     { name: "Ivory Coast",          score: 54, players: ["Zaha"] },
  ca:     { name: "Canada",               score: 53, players: ["Davies"] },
  ba:     { name: "Bosnia & Herz.",       score: 52, players: ["Dzeko"] },
  "gb-sct": { name: "Scotland",           score: 51, players: ["Robertson"] },
  cz:     { name: "Czech Republic",       score: 50, players: ["Schick"] },
  py:     { name: "Paraguay",             score: 49, players: ["Almiron"] },
  sa:     { name: "Saudi Arabia",         score: 48, players: ["Al-Dawsari"] },
  tn:     { name: "Tunisia",              score: 47, players: ["Khazri"] },
  za:     { name: "South Africa",         score: 44, players: ["Zwane"] },
  cv:     { name: "Cape Verde",           score: 43, players: ["Tavares"] },
  cd:     { name: "DR Congo",             score: 42, players: ["Lukebakio"] },
  jo:     { name: "Jordan",               score: 40, players: ["Al-Tamari"] },
  qa:     { name: "Qatar",                score: 39, players: ["Al-Moez Ali"] },
  uz:     { name: "Uzbekistan",           score: 38, players: ["Shomurodov"] },
  iq:     { name: "Iraq",                 score: 37, players: ["Ameen"] },
  cw:     { name: "Curaçao",              score: 36, players: ["Kluivert"] },
  ht:     { name: "Haiti",               score: 33, players: [] },
  pa:     { name: "Panama",               score: 32, players: [] },
  nz:     { name: "New Zealand",          score: 30, players: [] },
};

/**
 * Fetch FIFA rankings and boost country scores
 */
async function fetchAndScoreCountries() {
  const scores = JSON.parse(JSON.stringify(COUNTRY_BASELINE)); // deep copy

  // Try to get FIFA rankings from api-football
  try {
    const res = await axios.get(`${RAPID_BASE}/teams/rankings/fifa`, { headers: RAPID_HEADERS });
    const rankings = res.data?.response || [];
    rankings.forEach((r, i) => {
      const rank = r.rank || i + 1;
      const teamName = r.team?.name?.toLowerCase() || "";
      // Match ranking to our country codes
      for (const [code, data] of Object.entries(scores)) {
        if (data.name.toLowerCase() === teamName ||
            teamName.includes(data.name.toLowerCase().split(" ")[0])) {
          // Boost score based on FIFA rank (rank 1 = +10, rank 10 = +5, etc.)
          const rankBoost = Math.max(0, 10 - Math.floor(rank / 5));
          scores[code].score += rankBoost;
          scores[code].fifaRank = rank;
          break;
        }
      }
    });
    console.log("[Tournament] FIFA rankings fetched and applied.");
  } catch (err) {
    console.warn("[Tournament] FIFA rankings unavailable, using baseline scores:", err.message);
  }

  // Fetch key player OVRs for top 8 contenders and boost their country score
  const topContenders = Object.entries(scores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 8);

  for (const [code, data] of topContenders) {
    if (!data.players.length) continue;
    try {
      const res = await axios.get(`${RAPID_BASE}/players`, {
        headers: RAPID_HEADERS,
        params: { search: data.players[0], league: 39, season: 2024 },
      });
      const player = res.data?.response?.[0];
      const rating = parseFloat(player?.statistics?.[0]?.games?.rating || 0);
      if (rating > 0) {
        // Player rating 8.0+ boosts country, below 7.0 slightly reduces
        const ratingBoost = rating >= 8.0 ? 3 : rating >= 7.5 ? 1 : rating < 7.0 ? -1 : 0;
        scores[code].score += ratingBoost;
        scores[code].starPlayerRating = rating;
        console.log(`[Tournament] ${data.name} star player rating: ${rating} → boost: ${ratingBoost}`);
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  return scores;
}

/**
 * Compute and cache tournament prediction.
 * Returns { winner, losingCountries, scoreboard, computedAt }
 */
export async function getTournamentPrediction() {
  if (tournamentCache) {
    console.log("[Tournament] Returning cached prediction.");
    return tournamentCache;
  }

  console.log("[Tournament] Computing prediction for the first time...");
  const scores = await fetchAndScoreCountries();

  const sorted = Object.entries(scores)
    .map(([code, data]) => ({ code, ...data }))
    .sort((a, b) => b.score - a.score);

  const winner = sorted[0];
  // Bottom 10 as likely losers (early exit candidates)
  const losingCountries = sorted.slice(-10).reverse();
  // Top 8 as contenders
  const topContenders = sorted.slice(0, 8);

  tournamentCache = {
    winner,
    losingCountries,
    topContenders,
    scoreboard: sorted,
    computedAt: new Date().toISOString(),
  };

  console.log(`[Tournament] Prediction computed. Winner: ${winner.name} (score: ${winner.score})`);
  return tournamentCache;
}

/**
 * Fetch all World Cup matches (recent + upcoming)
 */
export async function getMatches() {
  try {
    const res = await axios.get(`${BASE}/competitions/${WC_ID}/matches`, { headers: HEADERS });
    return res.data.matches || [];
  } catch (err) {
    console.error("Football API error (matches):", err.message);
    return [];
  }
}

export async function getStandings() {
  try {
    const res = await axios.get(`${BASE}/competitions/${WC_ID}/standings`, { headers: HEADERS });
    return res.data.standings || [];
  } catch (err) {
    console.error("Football API error (standings):", err.message);
    return [];
  }
}

export async function getTopScorers() {
  try {
    const res = await axios.get(`${BASE}/competitions/${WC_ID}/scorers`, { headers: HEADERS });
    return res.data.scorers || [];
  } catch (err) {
    console.error("Football API error (scorers):", err.message);
    return [];
  }
}

export async function buildMatchContext() {
  const [matches, standings, scorers] = await Promise.all([
    getMatches(),
    getStandings(),
    getTopScorers(),
  ]);

  const played = matches
    .filter((m) => m.status === "FINISHED")
    .slice(-5)
    .map((m) => `${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name} (${m.utcDate.slice(0, 10)})`)
    .join("\n");

  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED" || m.status === "TIMED")
    .slice(0, 5)
    .map((m) => `${m.homeTeam.name} vs ${m.awayTeam.name} — ${m.utcDate.slice(0, 10)}`)
    .join("\n");

  const standingsSummary = standings
    .slice(0, 4)
    .map((group) => {
      const groupName = group.group || group.stage;
      const table = group.table
        .slice(0, 4)
        .map((t) => `  ${t.position}. ${t.team.name} — P${t.playedGames} W${t.won} D${t.draw} L${t.lost} GD${t.goalDifference} Pts${t.points}`)
        .join("\n");
      return `${groupName}:\n${table}`;
    })
    .join("\n\n");

  const scorersSummary = scorers
    .slice(0, 5)
    .map((s) => `${s.player.name} (${s.team.name}) — ${s.goals} goals`)
    .join("\n");

  return `
=== WORLD CUP 2026 LIVE CONTEXT ===

RECENT RESULTS:
${played || "No recent results yet"}

UPCOMING MATCHES:
${upcoming || "No upcoming matches scheduled"}

GROUP STANDINGS:
${standingsSummary || "Standings not yet available"}

TOP SCORERS:
${scorersSummary || "No scorers yet"}
`.trim();
}