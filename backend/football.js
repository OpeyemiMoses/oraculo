import axios from "axios";

const BASE = "https://api.football-data.org/v4";
const HEADERS = { "X-Auth-Token": process.env.FOOTBALL_API_KEY };

// Set FOOTBALL_WC_ID in .env once the 2026 World Cup ID is known.
// Falls back to 2022 (ID: 2000) for testing during pre-tournament phase.
const WC_ID = process.env.FOOTBALL_WC_ID ? parseInt(process.env.FOOTBALL_WC_ID) : 2000;

// ─── API-Football (RapidAPI) ──────────────────────────────────────────────────
const RAPID_BASE = "https://api-football186.p.rapidapi.com";
const RAPID_HEADERS = {
  "x-rapidapi-host": "api-football186.p.rapidapi.com",
  "x-rapidapi-key": process.env.RAPIDAPI_KEY,
};

/**
 * Fetch FIFA world rankings (top 20)
 */
export async function getFIFARankings() {
  try {
    const res = await axios.get(`${RAPID_BASE}/rankings/fifa`, { headers: RAPID_HEADERS });
    const rankings = res.data?.response || res.data?.rankings || [];
    return rankings.slice(0, 20).map((r, i) => ({
      rank: r.rank || i + 1,
      team: r.team?.name || r.name,
      points: r.points,
    }));
  } catch (err) {
    console.error("FIFA rankings error:", err.message);
    return [];
  }
}

/**
 * Fetch a player's OVR rating by name (searches recent seasons + top leagues)
 */
export async function getPlayerOVR(playerName) {
  const seasons = [2026, 2025, 2024];
  const leagues = [1, 39, 140, 61, 78, 135]; // WC, PL, La Liga, Ligue 1, Bundesliga, Serie A

  for (const season of seasons) {
    for (const league of leagues) {
      try {
        const res = await axios.get(`${RAPID_BASE}/players`, {
          headers: RAPID_HEADERS,
          params: { search: playerName, league, season },
        });
        const player = res.data?.response?.[0];
        if (!player) continue;
        const stats = player.statistics?.[0];
        if (!stats?.games?.rating) continue;
        return {
          name: player.player.name,
          rating: parseFloat(stats.games.rating).toFixed(1),
          goals: stats.goals?.total || 0,
          assists: stats.goals?.assists || 0,
          appearances: stats.games?.appearences || 0,
          season,
          league: stats.league?.name,
        };
      } catch {}
    }
  }
  return null;
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

/**
 * Fetch current World Cup standings
 */
export async function getStandings() {
  try {
    const res = await axios.get(`${BASE}/competitions/${WC_ID}/standings`, { headers: HEADERS });
    return res.data.standings || [];
  } catch (err) {
    console.error("Football API error (standings):", err.message);
    return [];
  }
}

/**
 * Fetch top scorers
 */
export async function getTopScorers() {
  try {
    const res = await axios.get(`${BASE}/competitions/${WC_ID}/scorers`, { headers: HEADERS });
    return res.data.scorers || [];
  } catch (err) {
    console.error("Football API error (scorers):", err.message);
    return [];
  }
}

/**
 * Build a context string to feed into the AI agent.
 * Pulls matches, standings, top scorers, FIFA rankings, and player OVRs.
 */
export async function buildMatchContext() {
  const [matches, standings, scorers, fifaRankings] = await Promise.all([
    getMatches(),
    getStandings(),
    getTopScorers(),
    getFIFARankings(),
  ]);

  // Recent + upcoming matches (last 5 played, next 5 upcoming)
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

  // Group standings summary
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

  // Top 5 scorers
  const scorersSummary = scorers
    .slice(0, 5)
    .map((s) => `${s.player.name} (${s.team.name}) — ${s.goals} goals`)
    .join("\n");

  // FIFA rankings (top 20)
  const rankingsSummary = fifaRankings.length > 0
    ? fifaRankings
        .map((r) => `  ${r.rank}. ${r.team}${r.points ? ` (${r.points} pts)` : ""}`)
        .join("\n")
    : "FIFA rankings temporarily unavailable";

  // Top scorer player OVRs (fetch ratings for top 3 scorers)
  let playerOVRSummary = "";
  if (scorers.length > 0) {
    const ovrResults = await Promise.allSettled(
      scorers.slice(0, 3).map((s) => getPlayerOVR(s.player.name))
    );
    const ovrs = ovrResults
      .map((r) => r.value)
      .filter(Boolean);

    if (ovrs.length > 0) {
      playerOVRSummary = `\nTOP PLAYER RATINGS:\n` +
        ovrs.map((p) => `  ${p.name} — Rating: ${p.rating}/10 | ${p.goals}G ${p.assists}A in ${p.appearances} apps (${p.league} ${p.season})`).join("\n");
    }
  }

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
${playerOVRSummary}

FIFA WORLD RANKINGS (Top 20):
${rankingsSummary}
`.trim();
}