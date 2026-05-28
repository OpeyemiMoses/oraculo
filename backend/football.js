import axios from "axios";

const BASE = "https://api.football-data.org/v4";
const HEADERS = { "X-Auth-Token": process.env.FOOTBALL_API_KEY };

// Set FOOTBALL_WC_ID in .env once the 2026 World Cup ID is known.
// Falls back to 2022 (ID: 2000) for testing during pre-tournament phase.
const WC_ID = process.env.FOOTBALL_WC_ID ? parseInt(process.env.FOOTBALL_WC_ID) : 2000;

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
 * Pulls matches, standings, and top scorers together.
 */
export async function buildMatchContext() {
  const [matches, standings, scorers] = await Promise.all([
    getMatches(),
    getStandings(),
    getTopScorers(),
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