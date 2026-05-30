import { Link } from "react-router-dom";
import { getMarketDisplay } from "../utils/marketStatus.js";

const FLAG_COLORS = {
  br: "#009c3b", ar: "#74acdf", fr: "#002395", de: "#dd0000", es: "#aa151b",
  pt: "#006600", ng: "#008751", "gb-eng": "#cf111a", us: "#3c3b6e", jp: "#bc002d",
  ma: "#c1272d", mx: "#006847", nl: "#ae1c28", be: "#333333", hr: "#ff0000",
  se: "#006aa7", pl: "#dc143c", rs: "#c6363c", ch: "#ff0000", dk: "#c60c30",
  au: "#00008b", sa: "#006c35", ir: "#239f40", uy: "#5aaae7", co: "#fcd116",
  ec: "#ffd100", cl: "#d52b1e", pe: "#d91023", sn: "#00853f", gh: "#006b3f",
  eg: "#ce1126", cm: "#007a5e", ci: "#f77f00", dz: "#006233", tn: "#e70013",
  kr: "#003478", ca: "#ff0000", qa: "#8d1b3d",
};

const PLAYER_COUNTRIES = {
  neymar: "br", vinicius: "br", "vini jr": "br", rodrygo: "br", raphinha: "br",
  paqueta: "br", alisson: "br", ederson: "br", marquinhos: "br", casemiro: "br",
  richarlison: "br", antony: "br", "gabriel jesus": "br", "gabriel martinelli": "br",
  endrick: "br", militao: "br", militão: "br",
  messi: "ar", "di maria": "ar", dybala: "ar", "lautaro martinez": "ar",
  "de paul": "ar", "mac allister": "ar", molina: "ar", "emiliano martinez": "ar",
  romero: "ar", otamendi: "ar", paredes: "ar",
  mbappe: "fr", mbappé: "fr", griezmann: "fr", giroud: "fr", benzema: "fr",
  dembele: "fr", dembelé: "fr", thuram: "fr", tchouameni: "fr", camavinga: "fr",
  rabiot: "fr", varane: "fr", kante: "fr", kanté: "fr", lloris: "fr",
  maignan: "fr", saliba: "fr", upamecano: "fr",
  kane: "gb-eng", bellingham: "gb-eng", saka: "gb-eng", rashford: "gb-eng",
  sterling: "gb-eng", foden: "gb-eng", mount: "gb-eng", rice: "gb-eng",
  trippier: "gb-eng", maguire: "gb-eng", pickford: "gb-eng", grealish: "gb-eng",
  walker: "gb-eng", "alexander-arnold": "gb-eng", trent: "gb-eng",
  muller: "de", müller: "de", neuer: "de", gnabry: "de", musiala: "de",
  wirtz: "de", havertz: "de", kimmich: "de", goretzka: "de", rudiger: "de",
  rüdiger: "de", "ter stegen": "de", kroos: "de", gundogan: "de", gündogan: "de",
  pedri: "es", gavi: "es", yamal: "es", lamine: "es", morata: "es",
  "ansu fati": "es", busquets: "es", laporte: "es", olmo: "es",
  ronaldo: "pt", cristiano: "pt", "bernardo silva": "pt", "joao felix": "pt",
  "joão félix": "pt", "diogo jota": "pt", "ruben dias": "pt", "rúben dias": "pt",
  pepe: "pt", cancelo: "pt", "nuno mendes": "pt", vitinha: "pt", leao: "pt", leão: "pt",
  osimhen: "ng", lookman: "ng", chukwueze: "ng", iheanacho: "ng",
  aribo: "ng", ndidi: "ng",
  hakimi: "ma", ziyech: "ma", "en-nesyri": "ma", amrabat: "ma",
  sabiri: "ma", aguerd: "ma", boufal: "ma", ounahi: "ma",
  mane: "sn", manè: "sn", sadio: "sn", koulibaly: "sn", "ismaila sarr": "sn",
  gueye: "sn", mendy: "sn",
  salah: "eg", "mo salah": "eg", trezeguet: "eg",
  "van dijk": "nl", "de jong": "nl", depay: "nl", gakpo: "nl", dumfries: "nl",
  "de ligt": "nl", weghorst: "nl",
  "de bruyne": "be", lukaku: "be", hazard: "be", tielemans: "be",
  carrasco: "be", "de ketelaere": "be",
  modric: "hr", modrić: "hr", brozovic: "hr", brozović: "hr",
  gvardiol: "hr", kramaric: "hr", perišić: "hr",
  suarez: "uy", cavani: "uy", nunez: "uy", darwin: "uy", valverde: "uy",
  gimenez: "uy", "de arrascaeta": "uy",
  james: "co", "james rodriguez": "co", falcao: "co", cuadrado: "co",
  "luis diaz": "co", caicedo: "co",
  pulisic: "us", reyna: "us", mckennie: "us", weah: "us", aaronson: "us",
  adams: "us", turner: "us",
  mitoma: "jp", kubo: "jp", endo: "jp", doan: "jp", maeda: "jp",
  kamada: "jp", ueda: "jp", minamino: "jp",
  son: "kr", "son heung-min": "kr", "kim min-jae": "kr", hwang: "kr",
  lozano: "mx", hirving: "mx", jimenez: "mx", "raul jimenez": "mx",
  guardado: "mx", ochoa: "mx",
  davies: "ca", alphonso: "ca", "jonathan david": "ca", osorio: "ca", larin: "ca",
  "al-dawsari": "sa", dawsari: "sa",
  taremi: "ir", azmoun: "ir", jahanbakhsh: "ir",
  xhaka: "ch", shaqiri: "ch", sommer: "ch", akanji: "ch",
  eriksen: "dk", hojlund: "dk", højlund: "dk", christensen: "dk",
  isak: "se", forsberg: "se", ibrahimovic: "se",
  lewandowski: "pl", zielinski: "pl", szczesny: "pl", milik: "pl",
  vlahovic: "rs", tadic: "rs", "milinkovic-savic": "rs", jovic: "rs",
  kudus: "gh", partey: "gh", ayew: "gh", "afena-gyan": "gh",
  "choupo-moting": "cm", aboubakar: "cm", anguissa: "cm",
  zaha: "ci", kessie: "ci", gradel: "ci",
  "enner valencia": "ec", plata: "ec",
  "alexis sanchez": "cl", vidal: "cl", medel: "cl",
  guerrero: "pe", farfan: "pe", tapia: "pe", lapadula: "pe",
  mahrez: "dz", bennacer: "dz", slimani: "dz", brahimi: "dz",
  khazri: "tn", msakni: "tn",
  leckie: "au", irvine: "au", degenek: "au",
  afif: "qa", pogba: "fr",
};

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
  for (const [player, code] of Object.entries(PLAYER_COUNTRIES)) {
    if (q.includes(player)) return code;
  }
  for (const [code, keywords] of COUNTRY_KEYWORDS) {
    if (keywords.some(kw => q.includes(kw))) return code;
  }
  return null;
}

export default function MarketCard({ market }) {
  const display = getMarketDisplay(market);
  const totalPool = display.pool.toFixed(2);

  const resolvedCountry = market.detectedCountry || detectCountryFromQuestion(market.question);
  const flagColor = resolvedCountry ? (FLAG_COLORS[resolvedCountry] || null) : null;

  // White border for markets with no detected country/player
  const cardBorder = flagColor
    ? `1px solid ${flagColor}55`
    : "1px solid rgba(255,255,255,0.15)";
  const cardShadow = flagColor
    ? `0 0 12px ${flagColor}22`
    : "0 0 10px rgba(255,255,255,0.04)";

  const resolvedOutcome = market.status === "Resolved"
    ? (market.agentCorrect
        ? { label: "Oracle ✓", color: "var(--green3)", border: "#1a4d2a" }
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

      {/* Left edge strip — flag color or white */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: 3,
        background: flagColor || "rgba(255,255,255,0.25)",
        opacity: flagColor ? 0.7 : 0.4,
        borderRadius: "8px 0 0 8px",
      }} />

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

      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
        <span className="label">Confidence</span>
        <div className="conf-bar-wrap" style={{ flex: 1 }}>
          <div className="conf-bar" style={{ width: `${market.confidencePct}%` }} />
        </div>
        <span style={{ fontSize: 12, color: "var(--silver)", fontWeight: 700, minWidth: 32 }}>{market.confidencePct}%</span>
      </div>

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

      {/* AI Decision Reason */}
      {market.resolution?.reason && (
        <div style={{
          position: "relative", zIndex: 1,
          borderTop: "1px solid #1a1a1a",
          paddingTop: 10, marginTop: 2,
        }}>
          <span className="label" style={{ display: "block", marginBottom: 4 }}>
            🤖 AI Decision · {market.resolution.dataSource || ""}
          </span>
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5, margin: 0 }}>
            {market.resolution.reason}
          </p>
        </div>
      )}
    </div>
  );
}