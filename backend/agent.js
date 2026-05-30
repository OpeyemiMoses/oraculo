import Groq from "groq-sdk";
import { buildMatchContext, getTournamentPrediction } from "./football.js";

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing. Add it to backend/.env before using /ask.");
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function extractConfidence(text) {
  const explicit = text.match(/CONFIDENCE:\s*(\d{1,2})/i);
  if (explicit) { const v = parseInt(explicit[1]); if (v >= 1 && v <= 99) return v; }
  const pct = text.match(/\b([1-9][0-9]?)\s*%/);
  if (pct) { const v = parseInt(pct[1]); if (v >= 1 && v <= 99) return v; }
  return 50;
}

// Detect if question is asking who will WIN the whole tournament
function isWinQuestion(q) {
  const lower = q.toLowerCase();
  const winPhrases = [
    "who will win", "who wins", "who is going to win", "who gonna win",
    "which team will win", "which country will win", "who will be champion",
    "who will be the champion", "world cup winner", "wc winner",
    "who takes the cup", "who lifts the trophy", "tournament winner",
    "champion of the world cup", "2026 champion", "win the world cup",
    "win the 2026", "win the wc"
  ];
  return winPhrases.some(p => lower.includes(p));
}

// Detect if question is asking who will LOSE / exit early
function isLoseQuestion(q) {
  const lower = q.toLowerCase();
  const losePhrases = [
    "who will lose", "who loses", "who will be eliminated", "who gets eliminated",
    "who will exit", "who will go out", "who will crash out",
    "which team will lose", "which country will lose", "early exit",
    "group stage exit", "who won't make it", "who will fail",
    "worst team", "weakest team", "bottom of the group"
  ];
  return losePhrases.some(p => lower.includes(p));
}

export async function askAgent(question) {
  // ── Handle WIN question with cached prediction ──
  if (isWinQuestion(question)) {
    try {
      const prediction = await getTournamentPrediction();
      const { winner, topContenders } = prediction;
      const contenderList = topContenders
        .map((c, i) => `${i + 1}. ${c.name}${c.fifaRank ? ` (FIFA #${c.fifaRank})` : ""}${c.starPlayerRating ? ` — star rating: ${c.starPlayerRating}` : ""}`)
        .join(", ");

      const analysis = `Based on FIFA rankings, player OVR ratings, and squad depth analysis, **${winner.name}** has the highest potential to win the 2026 World Cup. ` +
        `Their overall strength score of ${winner.score} leads all 48 qualified nations. ` +
        `Top contenders in order: ${contenderList}. ` +
        `This prediction is based on current player ratings and FIFA ranking data.`;

      return {
        type: "DIRECT_PREDICTION",
        analysis,
        confidencePct: 72,
        canCreateMarket: true,
        marketQuestion: `Will ${winner.name} win the 2026 FIFA World Cup?`,
        detectedCountry: winner.code,
        question,
      };
    } catch (err) {
      console.error("Tournament prediction error:", err.message);
    }
  }

  // ── Handle LOSE question with cached prediction ──
  if (isLoseQuestion(question)) {
    try {
      const prediction = await getTournamentPrediction();
      const { losingCountries } = prediction;
      const loserList = losingCountries
        .map((c, i) => `${i + 1}. ${c.name}${c.fifaRank ? ` (FIFA #${c.fifaRank})` : ""}`)
        .join(", ");

      const bottom = losingCountries[0];
      const analysis = `Based on FIFA rankings, squad depth, and player ratings, the teams most likely to exit early in the 2026 World Cup are: ${loserList}. ` +
        `**${bottom.name}** ranks as the weakest qualified team with a strength score of ${bottom.score}. ` +
        `These nations face significant challenges against stronger opposition in the group stage.`;

      return {
        type: "DIRECT_PREDICTION",
        analysis,
        confidencePct: 65,
        canCreateMarket: true,
        marketQuestion: `Will ${bottom.name} be eliminated in the group stage of the 2026 World Cup?`,
        detectedCountry: bottom.code,
        question,
      };
    } catch (err) {
      console.error("Tournament lose prediction error:", err.message);
    }
  }

  // ── Standard agent flow ──
  let matchContext = "";
  try { matchContext = await buildMatchContext(); } catch { matchContext = "Live match data temporarily unavailable."; }

  const systemPrompt = `You are Oráculo — an AI oracle for the 2026 FIFA World Cup.

=== 2026 FIFA WORLD CUP QUALIFIED TEAMS (48 teams) ===

HOSTS (automatic qualification):
  United States (us), Canada (ca), Mexico (mx)

CAF (Africa — 9 slots):
  Algeria (dz), Cape Verde (cv), Ivory Coast (ci), Egypt (eg),
  Ghana (gh), Morocco (ma), Senegal (sn), South Africa (za),
  Tunisia (tn), DR Congo (cd)

AFC (Asia — 8 slots):
  Australia (au), Iran (ir), Japan (jp), Jordan (jo),
  South Korea (kr), Qatar (qa), Saudi Arabia (sa), Uzbekistan (uz), Iraq (iq)

UEFA (Europe — 16 slots):
  Austria (at), Belgium (be), Bosnia and Herzegovina (ba), Croatia (hr),
  Czech Republic (cz), England (gb-eng), France (fr), Germany (de),
  Netherlands (nl), Norway (no), Portugal (pt), Scotland (gb-sct),
  Spain (es), Sweden (se), Switzerland (ch), Turkey (tr)

CONCACAF (excl. hosts — 3 slots):
  Curaçao (cw), Haiti (ht), Panama (pa)

CONMEBOL (South America — 6 slots):
  Argentina (ar), Brazil (br), Colombia (co), Ecuador (ec),
  Paraguay (py), Uruguay (uy)

OFC (Oceania — 1 slot):
  New Zealand (nz)

=== TEAMS NOT QUALIFIED for 2026 ===
Notable absences: Chile, Peru, Bolivia, Wales, Poland, Serbia, Denmark,
Hungary, Russia, Cameroon, Nigeria, Angola, Benin, Zambia, Mozambique,
Indonesia, Vietnam, China, India, Lebanon, Bahrain, Belarus, Romania, Slovakia.

=== PLAYER → NATIONAL TEAM MAPPING ===
Always use national team code, never club country.

France (fr): Mbappe/Mbappé, Griezmann, Thuram, Camavinga, Tchouameni, Maignan, Saliba, Dembele, Rabiot, Kante/Kanté
Argentina (ar): Messi, Di Maria, Dybala, Lautaro, Mac Allister, De Paul, Molina, Lisandro Martinez, Acuña
Portugal (pt): Ronaldo/Cristiano, Bernardo Silva, Joao Felix/João Félix, Diogo Jota, Cancelo, Leao/Leão, Bruno Fernandes, Vitinha, Ruben Dias
England (gb-eng): Kane, Bellingham, Saka, Rashford, Foden, Rice, Grealish, Trent, Trippier, Pickford
Germany (de): Muller/Müller, Neuer, Musiala, Wirtz, Havertz, Kimmich, Kroos, Gundogan/Gündogan, Rudiger/Rüdiger
Spain (es): Pedri, Gavi, Yamal/Lamine, Morata, Olmo, Navas, Rodri, Fabian/Fabián, Laporte
Brazil (br): Neymar, Vinicius/Vini Jr, Rodrygo, Raphinha, Richarlison, Casemiro, Endrick, Militao/Militão, Alisson, Marquinhos
Netherlands (nl): Van Dijk, De Jong, Gakpo, Depay, Dumfries, Blind, Virgil, Flekken, Frimpong
Belgium (be): De Bruyne, Lukaku, Tielemans, Doku, Theate, Castagne, Casteels
Croatia (hr): Modric/Modrić, Gvardiol, Brozovic/Brozović, Kramaric/Kramarić, Livakovic/Livaković
Morocco (ma): Hakimi, Ziyech, Amrabat, En-Nesyri, Ounahi, Bounou, Mazraoui
Senegal (sn): Mane/Mané, Koulibaly, Ismaila Sarr, Gueye, Mendy, Diallo
Egypt (eg): Salah/Mo Salah, El Shenawy, Marmoush, Trezeguet
Algeria (dz): Mahrez, Bennacer, Aouar, Slimani, Bensebaini
Ivory Coast (ci): Zaha, Kessie/Kessiè, Haller, Pepe/Pépé, Fofana
Ghana (gh): Kudus, Partey, Jordan Ayew, Andre Ayew, Lamptey
Tunisia (tn): Khazri, Msakni, Sassi, Talbi
South Africa (za): Zwane, Williams, Tau, Mothwa
Cape Verde (cv): Tavares, Andrade, Pina
DR Congo (cd): Lukebakio, Bongonda, Meschack Elia
Jordan (jo): Al-Tamari, Yazan, Almajali
Japan (jp): Mitoma, Kubo, Endo, Kamada, Tomiyasu, Ueda
South Korea (kr): Son/Son Heung-min, Kim Min-Jae, Lee Kang-In, Hwang Hee-Chan
Australia (au): Leckie, Hrustic, Ryan, Irvine
Iran (ir): Taremi, Azmoun, Jahanbakhsh, Gholizadeh
Saudi Arabia (sa): Al-Dawsari, Al-Shahrani, Al-Owais, Kanno
Qatar (qa): Al-Moez Ali, Boudiaf, Al-Haydos
Uzbekistan (uz): Shomurodov, Komilov, Ashurmatov
Iraq (iq): Ameen, Ali Adnan, Mohanad Ali
New Zealand (nz): Wood, Sail, James
Colombia (co): James/James Rodriguez, Luis Diaz, Falcao, Cuadrado, Arias, Cordoba
Uruguay (uy): Valverde, Darwin Nunez, Cavani, Suarez, Bentancur, Araujo
Ecuador (ec): Enner Valencia, Plata, Estrada, Preciado
Paraguay (py): Almiron/Almirón, Sanabria, Enciso
Norway (no): Haaland, Odegaard/Ødegaard, Sorloth/Sørløth, Ajer
Sweden (se): Isak, Forsberg, Ekdal, Olsen
Austria (at): Alaba, Sabitzer, Arnautovic/Arnautović, Laimer
Switzerland (ch): Xhaka, Shaqiri, Akanji, Sommer, Embolo
Turkey (tr): Calhanoglu/Çalhanoğlu, Guler/Güler, Yildiz/Yildız, Soyuncu
Czech Republic (cz): Schick, Soucek/Souček, Kuchta, Vaclik
Bosnia & Herzegovina (ba): Dzeko/Džeko, Pjanic/Pjanić, Kolasinac/Kolašinac
Scotland (gb-sct): Robertson, McTominay, Adams, Tierney
Curaçao (cw): Kluivert, Clasie, Fer
Haiti (ht): Martino, Duckens, Saintfiet
Panama (pa): Davis, Murillo, Fajardo, Roderick Miller

=== CLASSIFICATION RULES ===
1. NOT_WORLD_CUP — nothing to do with football or World Cup
2. PAST_EVENT — about something already completed/historical
3. FUTURE_PREDICTION — about a future match event (will X score, red card, injury, etc.)
4. DIRECT_PREDICTION — broad tournament prediction (who will win the WC, top scorer, best player, champion)
5. PARTICIPATION_CHECK — user is asking whether a player or team is playing/participating in the 2026 World Cup.

=== RESPONSE — return ONLY valid JSON, no markdown ===
{
  "type": "NOT_WORLD_CUP" | "PAST_EVENT" | "FUTURE_PREDICTION" | "DIRECT_PREDICTION" | "PARTICIPATION_CHECK",
  "analysis": "sharp, direct answer (2-5 sentences)",
  "confidencePct": 0,
  "canCreateMarket": false,
  "marketQuestion": null,
  "detectedCountry": "br" | null
}

=== RULES ===
- canCreateMarket: true ONLY for FUTURE_PREDICTION and DIRECT_PREDICTION
- canCreateMarket: false for NOT_WORLD_CUP, PAST_EVENT, and PARTICIPATION_CHECK
- confidencePct: 0 for NOT_WORLD_CUP, PAST_EVENT, and PARTICIPATION_CHECK
- marketQuestion: null for PARTICIPATION_CHECK, NOT_WORLD_CUP, PAST_EVENT
- For PARTICIPATION_CHECK: answer factually. End with: "This is a factual participation question — no prediction market needed."
- For NOT_WORLD_CUP: end analysis with "This question is not related to the World Cup."
- For PAST_EVENT: answer from historical data only
- detectedCountry: ALWAYS use the player's NATIONAL team code, never their club country`;

  const groq = getGroqClient();

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${matchContext}\n\nUSER QUESTION: ${question}` }
    ],
  });

  const raw = response.choices[0]?.message?.content || "{}";

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const type = parsed.type || "FUTURE_PREDICTION";
    const isParticipation = type === "PARTICIPATION_CHECK";
    const canCreate = isParticipation ? false : (parsed.canCreateMarket ?? true);

    return {
      type,
      analysis:        parsed.analysis || raw,
      confidencePct:   isParticipation ? 0 : (parsed.confidencePct || extractConfidence(raw)),
      canCreateMarket: canCreate,
      marketQuestion:  isParticipation ? null : (parsed.marketQuestion || question),
      detectedCountry: parsed.detectedCountry || null,
      question,
    };
  } catch {
    return {
      type: "FUTURE_PREDICTION",
      analysis: raw.replace(/CONFIDENCE:\s*\d+/i, "").trim(),
      confidencePct: extractConfidence(raw),
      canCreateMarket: true,
      marketQuestion: question,
      detectedCountry: null,
      question,
    };
  }
}