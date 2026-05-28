import { Link } from "react-router-dom";
import { getMarketDisplay } from "../utils/marketStatus.js";

// Primary flag color per country code
const FLAG_COLORS = {
  br: "#009c3b",   // Brazil green
  ar: "#74acdf",   // Argentina blue
  fr: "#002395",   // France blue
  de: "#dd0000",   // Germany red
  es: "#aa151b",   // Spain red
  pt: "#006600",   // Portugal green
  ng: "#008751",   // Nigeria green
  "gb-eng": "#cf111a", // England red
  us: "#3c3b6e",   // USA navy
  jp: "#bc002d",   // Japan red
  ma: "#c1272d",   // Morocco red
  mx: "#006847",   // Mexico green
  nl: "#ae1c28",   // Netherlands red
  be: "#000000",   // Belgium black
  hr: "#ff0000",   // Croatia red
  se: "#006aa7",   // Sweden blue
  pl: "#dc143c",   // Poland red
  rs: "#c6363c",   // Serbia red
  ch: "#ff0000",   // Switzerland red
  dk: "#c60c30",   // Denmark red
  au: "#00008b",   // Australia blue
  sa: "#006c35",   // Saudi Arabia green
  ir: "#239f40",   // Iran green
  uy: "#5aaae7",   // Uruguay blue
  co: "#fcd116",   // Colombia yellow
  ec: "#ffd100",   // Ecuador yellow
  cl: "#d52b1e",   // Chile red
  pe: "#d91023",   // Peru red
  sn: "#00853f",   // Senegal green
  gh: "#006b3f",   // Ghana green
  eg: "#ce1126",   // Egypt red
  cm: "#007a5e",   // Cameroon green
  ci: "#f77f00",   // Ivory Coast orange
  dz: "#006233",   // Algeria green
  tn: "#e70013",   // Tunisia red
  kr: "#003478",   // South Korea blue
  ca: "#ff0000",   // Canada red
  qa: "#8d1b3d",   // Qatar maroon
};

// Player name → national team country code
// Covers all 2026 World Cup squads with well-known players
const PLAYER_COUNTRIES = {
  // Brazil
  neymar: "br", vinicius: "br", "vini jr": "br", rodrygo: "br", raphinha: "br",
  paqueta: "br", alisson: "br", ederson: "br", marquinhos: "br", casemiro: "br",
  richarlison: "br", antony: "br", "gabriel jesus": "br", "gabriel martinelli": "br",
  endrick: "br", militao: "br", militão: "br",
  // Argentina
  messi: "ar", "di maria": "ar", dybala: "ar", "lautaro martinez": "ar",
  "de paul": "ar", "mac allister": "ar", molina: "ar", "emiliano martinez": "ar",
  romero: "ar", otamendi: "ar", paredes: "ar",
  // France
  mbappe: "fr", mbappé: "fr", griezmann: "fr", giroud: "fr", benzema: "fr",
  dembele: "fr", dembelé: "fr", thuram: "fr", tchouameni: "fr", camavinga: "fr",
  rabiot: "fr", varane: "fr", kante: "fr", kanté: "fr", lloris: "fr",
  maignan: "fr", saliba: "fr", upamecano: "fr",
  // England
  kane: "gb-eng", bellingham: "gb-eng", saka: "gb-eng", rashford: "gb-eng",
  sterling: "gb-eng", foden: "gb-eng", mount: "gb-eng", rice: "gb-eng",
  trippier: "gb-eng", maguire: "gb-eng", pickford: "gb-eng", grealish: "gb-eng",
  walker: "gb-eng", "alexander-arnold": "gb-eng", trent: "gb-eng",
  // Germany
  muller: "de", müller: "de", neuer: "de", gnabry: "de", musiala: "de",
  wirtz: "de", havertz: "de", kimmich: "de", goretzka: "de", rudiger: "de",
  rüdiger: "de", "ter stegen": "de", kroos: "de", gundogan: "de", gündogan: "de",
  // Spain
  pedri: "es", gavi: "es", yamal: "es", lamine: "es", morata: "es",
  "ansu fati": "es", busquets: "es", laporte: "es", olmo: "es",
  // Portugal
  ronaldo: "pt", cristiano: "pt", "bernardo silva": "pt", "joao felix": "pt",
  "joão félix": "pt", "diogo jota": "pt", "ruben dias": "pt", "rúben dias": "pt",
  pepe: "pt", cancelo: "pt", "nuno mendes": "pt", vitinha: "pt", leao: "pt", leão: "pt",
  // Nigeria
  osimhen: "ng", lookman: "ng", chukwueze: "ng", iheanacho: "ng",
  aribo: "ng", ndidi: "ng", "super eagles": "ng",
  // Morocco
  hakimi: "ma", ziyech: "ma", "en-nesyri": "ma", amrabat: "ma",
  sabiri: "ma", aguerd: "ma", boufal: "ma", ounahi: "ma",
  // Senegal
  mane: "sn", manè: "sn", sadio: "sn", koulibaly: "sn", "ismaila sarr": "sn",
  gueye: "sn", mendy: "sn",
  // Egypt
  salah: "eg", "mo salah": "eg", trezeguet: "eg",
  // Netherlands
  "van dijk": "nl", "de jong": "nl", depay: "nl", gakpo: "nl", dumfries: "nl",
  "de ligt": "nl", weghorst: "nl",
  // Belgium
  "de bruyne": "be", lukaku: "be", hazard: "be", tielemans: "be",
  carrasco: "be", "de ketelaere": "be",
  // Croatia
  modric: "hr", modrić: "hr", brozovic: "hr", brozović: "hr",
  gvardiol: "hr", kramaric: "hr", perišić: "hr",
  // Uruguay
  suarez: "uy", cavani: "uy", nunez: "uy", darwin: "uy", valverde: "uy",
  gimenez: "uy", "de arrascaeta": "uy",
  // Colombia
  james: "co", "james rodriguez": "co", falcao: "co", cuadrado: "co",
  "luis diaz": "co", caicedo: "co",
  // USA
  pulisic: "us", reyna: "us", mckennie: "us", weah: "us", aaronson: "us",
  adams: "us", turner: "us",
  // Japan
  mitoma: "jp", kubo: "jp", endo: "jp", doan: "jp", maeda: "jp",
  kamada: "jp", ueda: "jp", minamino: "jp",
  // South Korea
  son: "kr", "son heung-min": "kr", "kim min-jae": "kr", hwang: "kr",
  // Mexico
  lozano: "mx", hirving: "mx", jimenez: "mx", "raul jimenez": "mx",
  guardado: "mx", ochoa: "mx",
  // Canada
  davies: "ca", alphonso: "ca", "jonathan david": "ca", osorio: "ca", larin: "ca",
  // Saudi Arabia
  "al-dawsari": "sa", dawsari: "sa",
  // Iran
  taremi: "ir", azmoun: "ir", jahanbakhsh: "ir",
  // Switzerland
  xhaka: "ch", shaqiri: "ch", sommer: "ch", akanji: "ch",
  // Denmark
  eriksen: "dk", hojlund: "dk", højlund: "dk", christensen: "dk",
  // Sweden
  isak: "se", forsberg: "se", ibrahimovic: "se",
  // Poland
  lewandowski: "pl", zielinski: "pl", szczesny: "pl", milik: "pl",
  // Serbia
  vlahovic: "rs", tadic: "rs", "milinkovic-savic": "rs", jovic: "rs",
  // Ghana
  kudus: "gh", partey: "gh", ayew: "gh", "afena-gyan": "gh",
  // Cameroon
  "choupo-moting": "cm", aboubakar: "cm", anguissa: "cm",
  // Ivory Coast
  zaha: "ci", kessie: "ci", gradel: "ci",
  // Ecuador
  "enner valencia": "ec", plata: "ec",
  // Chile
  "alexis sanchez": "cl", vidal: "cl", medel: "cl",
  // Peru
  guerrero: "pe", farfan: "pe", tapia: "pe", lapadula: "pe",
  // Algeria
  mahrez: "dz", bennacer: "dz", slimani: "dz", brahimi: "dz",
  // Tunisia
  khazri: "tn", msakni: "tn",
  // Australia
  leckie: "au", irvine: "au", degenek: "au",
  // Qatar
  afif: "qa",
};

// Keyword map: each entry is [countryCode, [...keywords]]
// Keywords are lowercased; matching is case-insensitive whole-word substring.
const COUNTRY_KEYWORDS = [
  ["br", ["brazil", "brasileirão", "brasileiro", "brasileira"]],
  ["ar", ["argentina", "argentinian"]],
  ["fr", ["france", "french", "ligue 1", "ligue1"]],
  ["de", ["germany", "german", "bundesliga", "deutschland"]],
  ["es", ["spain", "spanish", "la liga", "laliga"]],
  ["pt", ["portugal", "portuguese", "primeira liga"]],
  ["ng", ["nigeria", "nigerian", "super eagles"]],
  ["gb-eng", ["england", "english", "premier league", "fa cup", "efl"]],
  ["us", ["usa", "united states", "mls", "usmnt", "uswnt", "american"]],
  ["jp", ["japan", "japanese", "j-league", "j league"]],
  ["ma", ["morocco", "moroccan", "atlas lions"]],
  ["mx", ["mexico", "mexican", "liga mx"]],
  ["nl", ["netherlands", "dutch", "holland", "eredivisie"]],
  ["be", ["belgium", "belgian", "jupiler"]],
  ["hr", ["croatia", "croatian"]],
  ["se", ["sweden", "swedish", "allsvenskan"]],
  ["pl", ["poland", "polish", "ekstraklasa"]],
  ["rs", ["serbia", "serbian"]],
  ["ch", ["switzerland", "swiss", "super league ch"]],
  ["dk", ["denmark", "danish", "superliga dk"]],
  ["au", ["australia", "australian", "a-league"]],
  ["sa", ["saudi arabia", "saudi", "saudi pro league"]],
  ["ir", ["iran", "iranian"]],
  ["uy", ["uruguay", "uruguayan"]],
  ["co", ["colombia", "colombian"]],
  ["ec", ["ecuador", "ecuadorian"]],
  ["cl", ["chile", "chilean"]],
  ["pe", ["peru", "peruvian"]],
  ["sn", ["senegal", "senegalese"]],
  ["gh", ["ghana", "ghanaian"]],
  ["eg", ["egypt", "egyptian"]],
  ["cm", ["cameroon", "cameroonian"]],
  ["ci", ["ivory coast", "côte d'ivoire", "cote d'ivoire", "ivorian"]],
  ["dz", ["algeria", "algerian"]],
  ["tn", ["tunisia", "tunisian"]],
  ["kr", ["south korea", "korean", "k-league", "k league"]],
  ["ca", ["canada", "canadian", "cpl"]],
  ["qa", ["qatar", "qatari"]],
];

function detectCountryFromQuestion(question) {
  if (!question) return null;
  const q = question.toLowerCase();

  // Check player names first — more specific than country keywords
  for (const [player, code] of Object.entries(PLAYER_COUNTRIES)) {
    if (q.includes(player)) return code;
  }

  // Fall back to country/league keyword matching
  for (const [code, keywords] of COUNTRY_KEYWORDS) {
    if (keywords.some(kw => q.includes(kw))) return code;
  }

  return null;
}

export default function MarketCard({ market }) {
  const display = getMarketDisplay(market);
  const totalPool = display.pool.toFixed(2);

  // Use backend-detected country first, fall back to question-text detection for old markets
  const resolvedCountry = market.detectedCountry || detectCountryFromQuestion(market.question);

  const flagColor = resolvedCountry ? (FLAG_COLORS[resolvedCountry] || null) : null;
  const cardBorder = flagColor
    ? `1px solid ${flagColor}55`   // 55 = ~33% opacity hex
    : undefined;
  const cardShadow = flagColor
    ? `0 0 12px ${flagColor}22`
    : undefined;

  // Resolved outcome badge
  const resolvedOutcome = market.status === "Resolved"
    ? (market.agentCorrect ? { label: "Oracle ✓", color: "var(--green3)", border: "#1a4d2a" }
                            : { label: "Oracle ✗", color: "var(--red3)",   border: "#4d1a2a" })
    : null;

  const questionText = (
    <p style={{
      fontSize: 13, color: "var(--text2)", lineHeight: 1.5,
      cursor: display.isActiveBettable ? "pointer" : "default",
      transition: "color 0.15s",
    }}
      onMouseEnter={e => { if (display.isActiveBettable) e.currentTarget.style.color = "var(--silver)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "var(--text2)"; }}
    >
      {market.question}
    </p>
  );

  return (
    <div className="card" style={{
      display: "flex", flexDirection: "column", gap: 12, minHeight: 140,
      position: "relative", overflow: "hidden",
      border: cardBorder,
      boxShadow: cardShadow,
    }}>

      {/* Flag colour strip on left edge */}
      {flagColor && (
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: 3, background: flagColor, opacity: 0.7, borderRadius: "8px 0 0 8px",
        }} />
      )}

      {resolvedCountry && (
        <img
          src={`https://flagcdn.com/w40/${resolvedCountry}.png`}
          alt={resolvedCountry}
          style={{
            position: "absolute", bottom: 10, right: 10,
            width: 28, height: 19, borderRadius: 3,
            opacity: 0.9, zIndex: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        />
      )}

      {/* Question + status tag */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, position: "relative", zIndex: 1 }}>
        {display.isActiveBettable ? (
          <Link to={`/market/${market.id}`} style={{ textDecoration: "none", flex: 1, paddingRight: resolvedCountry ? 36 : 0 }}>
            {questionText}
          </Link>
        ) : (
          <div style={{ flex: 1, paddingRight: resolvedCountry ? 36 : 0 }}>{questionText}</div>
        )}
        <span className={`tag ${display.statusClass}`}>{display.statusLabel}</span>
      </div>

      {/* Confidence bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
        <span className="label">Confidence</span>
        <div className="conf-bar-wrap" style={{ flex: 1 }}>
          <div className="conf-bar" style={{ width: `${market.confidencePct}%` }} />
        </div>
        <span style={{ fontSize: 12, color: "var(--silver)", fontWeight: 700, minWidth: 32 }}>{market.confidencePct}%</span>
      </div>

      {/* Pool + status row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
        <div>
          <span className="label">Pool</span>
          <p style={{ fontSize: 13, color: "var(--silver)", fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: 2 }}>
            {totalPool} USDC
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {resolvedOutcome && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: resolvedOutcome.color,
              border: `1px solid ${resolvedOutcome.border}`,
              borderRadius: 6, padding: "3px 8px",
            }}>
              {resolvedOutcome.label}
            </span>
          )}

          {display.timerLabel && (
            <div style={{ textAlign: "right" }}>
              <span className="label">Status</span>
              <p style={{ fontSize: 12, color: display.isClosed ? "var(--red3)" : "var(--text3)", marginTop: 2 }}>
                {display.timerLabel}
              </p>
            </div>
          )}

          {market.explorerUrl && (
            <a href={market.explorerUrl} target="_blank" rel="noreferrer"
              style={{
                fontSize: 11, color: "var(--text3)", textDecoration: "none",
                border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--silver)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}
            >
              X Layer ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}