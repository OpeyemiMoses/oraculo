import "dotenv/config";
import fs from "fs";
import express from "express";
import cors from "cors";
import { askAgent } from "./Agent.js";
import { createMarket, resolveMarket, cancelMarket, getAllMarkets, getMarket, getUserBets, getUserBalance } from "./Chain.js";

const app = express();
app.use(cors());
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
  "his", "her", "their", "team", "game", "match", "player"
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

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Oráculo API" });
});

// ─── Ask ──────────────────────────────────────────────────────────────────────

app.post("/ask", async (req, res) => {
  const { question } = req.body;
  if (!question || question.trim().length < 5) return res.status(400).json({ error: "Question too short" });

  try {
    const agentResult = await askAgent(question);

    let existingMarket = null;
    let carryOverConfidence = null;

    if (agentResult.canCreateMarket) {
      const allMarkets = await getAllMarkets();
     existingMarket = allMarkets.find(m =>
  m.status === "Open" && similarity(m.question, agentResult.marketQuestion) >= 0.7
) || null;

      if (existingMarket) {
        carryOverConfidence = existingMarket.confidencePct;
      }
    }

    return res.json({
      success: true,
      question,
      type:            agentResult.type,
      analysis:        agentResult.analysis,
      confidencePct:   carryOverConfidence || agentResult.confidencePct,
      canCreateMarket: agentResult.canCreateMarket,
      marketQuestion:  agentResult.marketQuestion,
      detectedCountry: agentResult.detectedCountry || null,
      existingMarket:  existingMarket ? {
        id:           existingMarket.id,
        question:     existingMarket.question,
        confidencePct: existingMarket.confidencePct,
        explorerUrl:  `${XLAYER_EXPLORER}/address/${process.env.CONTRACT_ADDRESS}`,
        analysis:     marketAnalysis[existingMarket.id] || null,
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

      if (analysis) {
        marketAnalysis[marketResult.marketId] = analysis;
        saveStorage(marketAnalysis);
      }
      if (detectedCountry) {
        marketAnalysis[`${marketResult.marketId}_country`] = detectedCountry;
        saveStorage(marketAnalysis);
      }
    }

    return res.json({
      success:     marketResult.success,
      market:      market ? { ...market, explorerUrl: `${XLAYER_EXPLORER}/address/${process.env.CONTRACT_ADDRESS}` } : null,
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
app.listen(PORT, () => console.log(`Oráculo API running on port ${PORT}`));