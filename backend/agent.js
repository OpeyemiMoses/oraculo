import Groq from "groq-sdk";
import { buildMatchContext } from "./football.js";

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

export async function askAgent(question) {
  let matchContext = "";
  try { matchContext = await buildMatchContext(); } catch { matchContext = "Live match data temporarily unavailable."; }

  const systemPrompt = `You are Oráculo — an AI oracle for the 2026 FIFA World Cup.

CLASSIFICATION RULES:
1. NOT_WORLD_CUP — nothing to do with football or World Cup
2. PAST_EVENT — about something already completed/historical. NEVER classify any question about the 2026 FIFA World Cup as PAST_EVENT — the tournament has not happened yet. Questions about players' future participation, future injuries, future performance at the 2026 World Cup are always FUTURE_PREDICTION or DIRECT_PREDICTION.
3. FUTURE_PREDICTION — about a future match event (will X happen, who will score, red card, injury, etc.)
4. DIRECT_PREDICTION — broad tournament prediction (who will win, champion, top scorer, best player)

2026 World Cup teams: USA, Mexico, Canada, Brazil, Argentina, France, England, Germany, Spain, Portugal, Netherlands, Belgium, Morocco, Nigeria, Senegal, Ghana, Egypt, Cameroon, Japan, South Korea, Australia, Saudi Arabia, Iran, Uruguay, Colombia, Ecuador, Chile, Peru, Croatia, Switzerland, Denmark, Sweden, Poland, Serbia, Czech Republic, Wales, Qatar, Ivory Coast, Algeria, Tunisia.

COUNTRY DETECTION: detect which country or player nationality the question is about.
Use ISO 3166-1 alpha-2 codes: br=Brazil, fr=France, ar=Argentina, de=Germany, es=Spain, pt=Portugal, ng=Nigeria, gb-eng=England, us=USA, jp=Japan, ma=Morocco, mx=Mexico, nl=Netherlands, be=Belgium, hr=Croatia, se=Sweden, pl=Poland, rs=Serbia, ch=Switzerland, dk=Denmark, au=Australia, sa=Saudi Arabia, ir=Iran, uy=Uruguay, co=Colombia, ec=Ecuador, cl=Chile, pe=Peru, sn=Senegal, gh=Ghana, eg=Egypt, cm=Cameroon, ci=Ivory Coast, dz=Algeria, tn=Tunisia, kr=South Korea, ca=Canada, qa=Qatar.

PLAYER → COUNTRY mapping (always use the player's national team, NOT club team):
Mbappe/Mbappé → fr | Griezmann/Thuram/Camavinga/Tchouameni/Maignan/Saliba → fr
Messi/Di Maria/Dybala/Lautaro/Mac Allister/De Paul → ar
Ronaldo/Cristiano/Bernardo Silva/Joao Felix/Diogo Jota/Cancelo/Leao → pt
Kane/Bellingham/Saka/Rashford/Foden/Rice/Grealish → gb-eng
Muller/Müller/Neuer/Musiala/Wirtz/Havertz/Kimmich/Kroos/Gundogan → de
Pedri/Gavi/Yamal/Lamine/Morata/Olmo → es
Neymar/Vinicius/Vini Jr/Rodrygo/Raphinha/Richarlison/Casemiro/Endrick → br
Salah/Mo Salah → eg | Mane/Manè/Koulibaly/Ismaila Sarr → sn
Osimhen/Lookman/Chukwueze/Ndidi → ng | Hakimi/Ziyech/Amrabat/En-Nesyri → ma
Van Dijk/De Jong/Gakpo/Depay → nl | De Bruyne/Lukaku/Tielemans → be
Modric/Modrić/Gvardiol/Brozovic → hr | Valverde/Darwin Nunez → uy
Pulisic/Reyna/McKennie → us | Davies/Alphonso/Jonathan David → ca
Mitoma/Kubo/Endo → jp | Son/Son Heung-min/Kim Min-Jae → kr
Lewandowski/Szczesny → pl | Vlahovic/Tadic → rs | Eriksen/Hojlund → dk
Xhaka/Shaqiri/Akanji → ch | Isak/Forsberg → se | Kudus/Partey → gh
Mahrez/Bennacer → dz | Zaha/Kessie → ci | Anguissa/Choupo-Moting → cm
James/Luis Diaz → co | Taremi/Azmoun → ir | Lozano/Ochoa → mx
If no specific country or player detected, return null.

RESPONSE — return ONLY valid JSON, no markdown:
{
  "type": "NOT_WORLD_CUP" | "PAST_EVENT" | "FUTURE_PREDICTION" | "DIRECT_PREDICTION",
  "analysis": "sharp, direct analysis (2-5 sentences)",
  "confidencePct": 63,
  "canCreateMarket": true | false,
  "marketQuestion": "clean specific market question",
  "detectedCountry": "br" | null
}

Rules:
- canCreateMarket: true only for FUTURE_PREDICTION and DIRECT_PREDICTION
- canCreateMarket: false for NOT_WORLD_CUP and PAST_EVENT
- confidencePct: 0 for NOT_WORLD_CUP and PAST_EVENT
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
    return {
      type:            parsed.type || "FUTURE_PREDICTION",
      analysis:        parsed.analysis || raw,
      confidencePct:   parsed.confidencePct || extractConfidence(raw),
      canCreateMarket: parsed.canCreateMarket ?? true,
      marketQuestion:  parsed.marketQuestion || question,
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