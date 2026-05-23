import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Home, Briefcase, Eye, MessageCircle, Plus, X, Trash2,
  Settings as SettingsIcon, Send, RotateCcw,
  Sparkles, AlertTriangle, ChevronRight, Loader2, Check,
  Info, Pencil, Microscope,
  Cloud, CloudUpload, CloudDownload, Copy,
} from 'lucide-react';

/* =========================================================
   Konstanten & Demo-Daten
   ========================================================= */

const ACCENT = '#FF6B35';
const ACCENT_SOFT = '#FFB59A';
const DONUT_COLORS = [
  '#FF6B35', '#FFB59A', '#F59E0B', '#10B981', '#06B6D4',
  '#8B5CF6', '#EC4899', '#6366F1', '#84CC16', '#F43F5E',
];

const DEFAULT_FX = { CHF: 1, USD: 0.88, EUR: 0.94, SEK: 0.085 };
const CURRENCIES = ['CHF', 'USD', 'EUR', 'SEK'];
const ASSET_CLASSES = [
  'Aktie Pharma', 'Aktie Tech', 'Aktie Industrie', 'Aktie Financials',
  'Aktie Energy', 'Aktie Defense', 'Aktie Halbleiter', 'Aktie Konsum',
  'Fund Tech', 'Fund Mixed', 'Gold ETF', 'Anleihe', 'Krypto', 'Sonstige',
];

const DEMO_PORTFOLIO = [
  { id: 'p1', ticker: 'NOVN', name: 'Novartis', assetClass: 'Aktie Pharma', shares: 200, costBasis: 53, currentPrice: 113.36, currency: 'CHF', purchaseDate: '2020-01-15', note: 'Solider Pharma-Anker mit Dividende', stopLoss: null },
  { id: 'p2', ticker: 'ROG', name: 'Roche PC', assetClass: 'Aktie Pharma', shares: 50, costBasis: 202, currentPrice: 315.30, currency: 'CHF', purchaseDate: '2019-06-10', note: 'Diagnostics, defensiv', stopLoss: null },
  { id: 'p3', ticker: 'BGFWT', name: 'BGF World Technology D2C', assetClass: 'Fund Tech', shares: 300, costBasis: 102, currentPrice: 162.70, currency: 'USD', purchaseDate: '2021-03-22', note: 'Breit gestreuter Tech-Fund', stopLoss: null },
  { id: 'p4', ticker: 'CSGOLD', name: 'iShares Gold CHF hedged', assetClass: 'Gold ETF', shares: 150, costBasis: 130, currentPrice: 296.80, currency: 'CHF', purchaseDate: '2020-04-01', note: 'Krisen-Hedge', stopLoss: null },
  { id: 'p5', ticker: 'SAAB-B', name: 'SAAB B', assetClass: 'Aktie Defense', shares: 22, costBasis: 586, currentPrice: 531, currency: 'SEK', purchaseDate: '2024-05-12', note: 'Defense-Welle EU', stopLoss: null },
  { id: 'p6', ticker: 'AMS', name: 'AMS-Osram', assetClass: 'Aktie Halbleiter', shares: 83, costBasis: 18.20, currentPrice: 20.94, currency: 'CHF', purchaseDate: '2024-09-01', note: 'Turnaround Bet', stopLoss: null },
  { id: 'p7', ticker: 'ALRIB', name: 'Riber', assetClass: 'Aktie Halbleiter', shares: 120, costBasis: 12.60, currentPrice: 13.82, currency: 'EUR', purchaseDate: '2024-10-15', note: 'MBE-Maschinen, AI-Infra Welle 2', stopLoss: null },
  { id: 'p8', ticker: 'CEG', name: 'Constellation Energy', assetClass: 'Aktie Energy', shares: 5, costBasis: 270, currentPrice: 285.83, currency: 'USD', purchaseDate: '2024-08-22', note: 'AI-Power Welle 3', stopLoss: null },
  { id: 'p9', ticker: 'ABBN', name: 'ABB', assetClass: 'Aktie Industrie', shares: 11, costBasis: 60, currentPrice: 83.50, currency: 'CHF', purchaseDate: '2023-11-05', note: 'Grid & Industrial AI', stopLoss: null },
  { id: 'p10', ticker: 'UBSG', name: 'UBS', assetClass: 'Aktie Financials', shares: 19, costBasis: 25, currentPrice: 36.89, currency: 'CHF', purchaseDate: '2023-04-10', note: 'CS-Übernahme Story', stopLoss: null },
];

const DEMO_WATCHLIST = [
  { id: 'w1', ticker: 'ENR', name: 'Siemens Energy', triggerPrice: 55, currency: 'EUR', thesis: 'Welle 3 AI-Power, Trafos-Knappheit', source: 'self', addedAt: new Date().toISOString() },
  { id: 'w2', ticker: 'SU', name: 'Schneider Electric', triggerPrice: 220, currency: 'EUR', thesis: 'Datacenter-Kühlung & Stromverteilung', source: 'self', addedAt: new Date().toISOString() },
];

/* =========================================================
   Storage (window.storage)
   ========================================================= */

const storage = {
  async get(key) {
    try {
      if (typeof window !== 'undefined' && window.storage && typeof window.storage.getItem === 'function') {
        const v = await window.storage.getItem(key);
        if (v == null) return null;
        return typeof v === 'string' ? JSON.parse(v) : v;
      }
    } catch (e) {
      console.warn('storage.get', key, e);
    }
    return null;
  },
  async set(key, value) {
    try {
      if (typeof window !== 'undefined' && window.storage && typeof window.storage.setItem === 'function') {
        await window.storage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('storage.set', key, e);
    }
  },
  async remove(key) {
    try {
      if (typeof window !== 'undefined' && window.storage && typeof window.storage.removeItem === 'function') {
        await window.storage.removeItem(key);
      }
    } catch (e) {
      console.warn('storage.remove', key, e);
    }
  },
};

/* =========================================================
   Market-Data: Finnhub + Yahoo (CORS-Proxy) Fallback
   ========================================================= */

const QUOTE_TTL_MS = 60 * 1000;
const quoteCache = new Map(); // ticker(uppercase) -> { ts, data }

// Schweizer/Europäische Suffixe für Yahoo-Symbol-Resolution.
// Wenn der User "NOVN" eingibt, probieren wir auch "NOVN.SW" etc.
const EXCHANGE_SUFFIXES = ['', '.SW', '.DE', '.PA', '.L', '.AS', '.MI', '.MC', '.ST', '.HE', '.OL', '.CO', '.VI'];

// Currency → bevorzugte Suffixe (Order matters). Verhindert, dass für „NOVN"
// (CHF-Currency) Yahoo zuerst auf einem zufälligen US-Listing landet.
const SUFFIX_BY_CURRENCY = {
  CHF: ['.SW', ''],
  EUR: ['.DE', '.PA', '.AS', '.MI', '.MC', '.VI', '.HE', ''],
  GBP: ['.L', ''],
  SEK: ['.ST', ''],
  NOK: ['.OL', ''],
  DKK: ['.CO', ''],
  USD: ['', '.SW', '.DE', '.L'],
};

function normalizeTicker(input) {
  return String(input || '').trim().toUpperCase();
}

async function fetchFinnhubQuote(ticker, apiKey) {
  if (!apiKey) return null;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    // Finnhub returns { c: current, pc: prevClose, ... } – c=0 bedeutet unbekannt
    if (!d || !d.c) return null;
    return { price: d.c, prevClose: d.pc || null, source: 'finnhub' };
  } catch { return null; }
}

async function fetchFinnhubProfile(ticker, apiKey) {
  if (!apiKey) return null;
  try {
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || !d.name) return null;
    return {
      name: d.name,
      currency: d.currency,
      exchange: d.exchange,
      industry: d.finnhubIndustry,
    };
  } catch { return null; }
}

async function fetchYahooViaProxy(ticker, { preferredCurrency } = {}) {
  // Yahoo Finance v8 chart endpoint via corsproxy.io (kein Key, internationale Coverage).
  // Wir probieren mehrere Exchange-Suffixe, falls der reine Ticker (z.B. NOVN) nicht trifft.
  // Bei bekannter Currency wird die Suffix-Reihenfolge umsortiert (CHF → .SW zuerst).
  let suffixes;
  if (ticker.includes('.') || ticker.includes('-') && /\.\w{1,3}$/.test(ticker)) {
    suffixes = [''];
  } else if (preferredCurrency && SUFFIX_BY_CURRENCY[preferredCurrency]) {
    const pref = SUFFIX_BY_CURRENCY[preferredCurrency];
    const rest = EXCHANGE_SUFFIXES.filter((s) => !pref.includes(s));
    suffixes = [...pref, ...rest];
  } else {
    suffixes = EXCHANGE_SUFFIXES;
  }
  const candidates = ticker.includes('.') ? [ticker] : suffixes.map((s) => ticker + s);
  for (const sym of candidates) {
    try {
      const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`;
      const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(target)}`);
      if (!r.ok) continue;
      const d = await r.json();
      const result = d?.chart?.result?.[0];
      if (!result?.meta?.regularMarketPrice) continue;
      const m = result.meta;
      return {
        price: m.regularMarketPrice,
        prevClose: m.previousClose || m.chartPreviousClose || null,
        currency: m.currency,
        exchange: m.exchangeName,
        name: m.longName || m.shortName || null,
        resolvedSymbol: sym,
        source: 'yahoo',
      };
    } catch { /* try next */ }
  }
  return null;
}

// Holt Quote + (optional) Profil. Reihenfolge: Finnhub-Quote → bei Misserfolg Yahoo.
// Profil wird nur fürs Enrichment (neue Position) benötigt – nicht für reines Refresh.
async function getMarketData(ticker, finnhubKey, { withProfile = false, preferredCurrency } = {}) {
  const t = normalizeTicker(ticker);
  const cacheKey = preferredCurrency ? `${t}|${preferredCurrency}` : t;
  const cached = quoteCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < QUOTE_TTL_MS && !withProfile) return cached.data;

  // Wenn Ticker bereits einen Exchange-Suffix hat (z.B. „NOVN.SW"), skippen wir Finnhub
  // (Finnhub kennt diese Notation oft nicht und schickt c=0).
  const hasSuffix = t.includes('.');
  let quote = hasSuffix ? null : await fetchFinnhubQuote(t, finnhubKey);
  let profile = withProfile && !hasSuffix ? await fetchFinnhubProfile(t, finnhubKey) : null;
  let yahoo = null;

  // Fallback: Yahoo für non-US oder wenn Finnhub leer
  if (!quote || (withProfile && !profile)) {
    yahoo = await fetchYahooViaProxy(t, { preferredCurrency });
  }

  const data = {
    price: quote?.price ?? yahoo?.price ?? null,
    prevClose: quote?.prevClose ?? yahoo?.prevClose ?? null,
    name: profile?.name ?? yahoo?.name ?? null,
    currency: profile?.currency ?? yahoo?.currency ?? null,
    exchange: profile?.exchange ?? yahoo?.exchange ?? null,
    industry: profile?.industry ?? null,
    resolvedSymbol: yahoo?.resolvedSymbol ?? t,
    source: quote ? 'finnhub' : (yahoo ? 'yahoo' : null),
    fetchedAt: Date.now(),
  };

  if (data.price != null) quoteCache.set(cacheKey, { ts: Date.now(), data });
  return data;
}

/* =========================================================
   AI Call (Anthropic)
   ========================================================= */

const MODEL_COACH = 'claude-sonnet-4-6';
const MODEL_ENRICH = 'claude-haiku-4-5-20251001';

async function callClaude({
  system,
  messages,
  apiKey,
  model,
  maxTokens = 2000,
  tools,
  betas,
}) {
  // Falls Artifact-Runtime ein window.claude.complete bereitstellt, nutze es
  if (typeof window !== 'undefined' && window.claude && typeof window.claude.complete === 'function') {
    const systemText = typeof system === 'string'
      ? system
      : (Array.isArray(system) ? system.map((b) => b.text || '').join('\n\n') : '');
    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
      .join('\n\n');
    const prompt = `${systemText}\n\n${transcript}\n\nASSISTANT:`;
    const out = await window.claude.complete(prompt);
    return typeof out === 'string' ? out : (out?.completion || '');
  }
  if (!apiKey) {
    throw new Error('Kein Anthropic API-Key gesetzt. Trag ihn in den Einstellungen (Zahnrad oben rechts) ein.');
  }
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (betas && betas.length) headers['anthropic-beta'] = betas.join(',');

  const body = {
    model: model || MODEL_COACH,
    max_tokens: maxTokens,
    system,
    messages,
  };
  if (tools && tools.length) body.tools = tools;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`API ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  // Mit web_search können mehrere content-Blöcke kommen (text, server_tool_use,
  // web_search_tool_result). Wir konkatenieren nur Text.
  const text = (data?.content || [])
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return text;
}

/* =========================================================
   Draft-Enrichment: 1 AI-Call für N Drafts
   ========================================================= */

async function enrichDrafts(drafts, { apiKey, finnhubKey, onProgress } = {}) {
  onProgress?.('Hole Live-Kurse…');

  // 1) Parallel Marktdaten pro Draft (Finnhub + Yahoo-Fallback)
  const market = await Promise.all(
    drafts.map((d) => getMarketData(d.ticker, finnhubKey, {
      withProfile: true,
      preferredCurrency: d.currency || undefined,
    }).catch(() => null))
  );

  const merged = drafts.map((d, i) => {
    const m = market[i] || {};
    return {
      tempId: d.tempId,
      ticker: normalizeTicker(d.ticker),
      resolvedTicker: m.resolvedSymbol || null,
      shares: d.shares,
      costBasis: d.costBasis,
      currency: d.currency || m.currency || 'USD',
      currentPrice: m.price ?? d.costBasis,
      name: m.name || normalizeTicker(d.ticker),
      industry: m.industry || null,
      exchange: m.exchange || null,
      source: m.source || null,
    };
  });

  // 2) Ein einziger Haiku-Call klassifiziert alle Drafts auf einmal
  let aiResult = [];
  if (apiKey) {
    onProgress?.('Klassifiziere mit AI…');
    try {
      const compactInput = merged.map((m, idx) => ({
        idx,
        ticker: m.ticker,
        name: m.name,
        industry: m.industry,
        exchange: m.exchange,
      }));
      const system = `Du klassifizierst Aktien/ETFs/Funds für ein Schweizer Portfolio-Tool. Antworte AUSSCHLIESSLICH mit einem validen JSON-Array. Kein Markdown, keine Erklärung, kein Text drumherum.

Format pro Eintrag:
{"idx": <number>, "assetClass": "<eine der erlaubten>", "thesis": "<1 Satz, max 90 Zeichen>"}

Erlaubte assetClass-Werte (exakt einer): ${ASSET_CLASSES.join(' | ')}

Wähle den passendsten Wert basierend auf ticker/name/industry. Bei Unsicherheit "Sonstige".`;
      const userMsg = `Klassifiziere diese Positionen:\n${JSON.stringify(compactInput)}`;
      const reply = await callClaude({
        system,
        messages: [{ role: 'user', content: userMsg }],
        apiKey,
        model: MODEL_ENRICH,
        maxTokens: 800,
      });
      const match = reply.match(/\[[\s\S]*\]/);
      if (match) aiResult = JSON.parse(match[0]);
    } catch (e) {
      console.warn('Enrichment-AI fehlgeschlagen:', e);
    }
  }

  // 3) Finale Position-Objekte zusammenbauen
  const today = new Date().toISOString().slice(0, 10);
  return merged.map((m, i) => {
    const ai = aiResult.find((x) => x.idx === i) || {};
    const thesis = ai.thesis || '';
    return {
      id: uid(),
      ticker: m.ticker,
      resolvedTicker: m.resolvedTicker || null,
      name: m.name,
      assetClass: ASSET_CLASSES.includes(ai.assetClass) ? ai.assetClass : 'Sonstige',
      shares: m.shares,
      costBasis: m.costBasis,
      currentPrice: m.currentPrice,
      currency: m.currency,
      purchaseDate: today,
      note: thesis,
      stopLoss: null,
      lastQuoteAt: m.source ? Date.now() : null,
      quoteSource: m.source,
      dueDiligence: { ...emptyDD(), thesis },
    };
  });
}

/* =========================================================
   Due-Diligence Schema + Migration
   ========================================================= */

const DD_FIELDS_AI_WRITABLE = ['thesis', 'strengths', 'risks', 'catalysts', 'fundamentals', 'recommendation'];
const DD_LIST_FIELDS = ['strengths', 'risks', 'catalysts', 'tags'];
const DD_TEXT_FIELDS = ['thesis', 'fundamentals', 'userNotes'];
const DD_HISTORY_CAP = 5;

const VERDICTS = ['sell', 'reduce', 'hold', 'add', 'watch'];
const VERDICT_RANK = { sell: 0, reduce: 1, add: 2, watch: 3, hold: 4, '': 5 };
const VERDICT_LABEL = {
  sell: 'Verkaufen',
  reduce: 'Reduzieren',
  hold: 'Halten',
  add: 'Nachkaufen',
  watch: 'Beobachten',
};
const VERDICT_COLOR = {
  sell: 'red',
  reduce: 'accent',
  hold: 'neutral',
  add: 'green',
  watch: 'blue',
};
const VERDICT_EMOJI = {
  sell: '🔴', reduce: '🟠', hold: '⚪', add: '🟢', watch: '🔵',
};

function emptyDD() {
  return {
    thesis: '',
    strengths: [],
    risks: [],
    catalysts: [],
    fundamentals: '',
    userNotes: '',
    tags: [],
    recommendation: { verdict: '', confidence: '', rationale: '', setAt: null },
    lastAnalyzedAt: null,
    lastAnalysisModel: '',
    history: [],
  };
}

function ensureDD(position) {
  const base = emptyDD();
  if (position.dueDiligence && typeof position.dueDiligence === 'object') {
    const d = position.dueDiligence;
    const rec = d.recommendation && typeof d.recommendation === 'object' ? d.recommendation : {};
    return {
      ...base,
      ...d,
      strengths: Array.isArray(d.strengths) ? d.strengths : [],
      risks: Array.isArray(d.risks) ? d.risks : [],
      catalysts: Array.isArray(d.catalysts) ? d.catalysts : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
      history: Array.isArray(d.history) ? d.history : [],
      recommendation: {
        verdict: VERDICTS.includes(rec.verdict) ? rec.verdict : '',
        confidence: ['low', 'medium', 'high'].includes(rec.confidence) ? rec.confidence : '',
        rationale: typeof rec.rationale === 'string' ? rec.rationale : '',
        setAt: typeof rec.setAt === 'number' ? rec.setAt : null,
      },
    };
  }
  // Migration: alte Position ohne DD. note → thesis.
  return { ...base, thesis: position.note || '' };
}

function migrateDD(positions) {
  return positions.map((p) => ({ ...p, dueDiligence: ensureDD(p) }));
}

function appendDDHistory(dd, entry) {
  const history = [entry, ...(dd.history || [])].slice(0, DD_HISTORY_CAP);
  return { ...dd, history };
}

/* =========================================================
   Per-Position Deep-Analyse (Sonnet + web_search)
   ========================================================= */

async function analyzePositionDeep(position, { apiKey } = {}) {
  if (!apiKey) throw new Error('Anthropic API-Key fehlt (Einstellungen).');

  const current = ensureDD(position);
  const system = `Du bist ein Equity-Research-Analyst für einen Schweizer Privatanleger. Liefere eine fundierte Due-Diligence zu EINER Aktie/ETF/Fund.

Recherchiere mit web_search aktuelle Earnings, Analyst-Calls, Sektor-News (max. 5 Suchen). Sei knapp und präzise. Keine Floskeln.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt – kein Markdown, kein Text drumherum:
{
  "thesis": "1–2 Sätze, max 220 Zeichen, der Investment-Case",
  "strengths": ["3–5 Bullets, jeweils max 110 Zeichen"],
  "risks": ["3–5 Bullets, jeweils max 110 Zeichen"],
  "catalysts": ["2–4 konkrete Events/Earnings/Daten, idealerweise mit Datum"],
  "fundamentals": "Free-Text mit P/E, EV/EBITDA, Marge, Verschuldung, Wachstum. Max 400 Zeichen.",
  "recommendation": {
    "verdict": "sell|reduce|hold|add|watch",
    "confidence": "low|medium|high",
    "rationale": "1–2 Sätze, max 240 Zeichen, warum dieser Verdict"
  },
  "summary": "1 Satz für die History, max 120 Zeichen"
}

VERDICT-LEITPLANKE:
- "sell": klare These zum kompletten Ausstieg (Strukturbruch, Bilanz, Bewertung überreizt)
- "reduce": Position aktuell zu gross / Gewinnmitnahme angebracht / Risiken steigen
- "hold": These intakt, keine starken neuen Signale
- "add": Bewertung/Chance-Risiko spricht für aufstocken
- "watch": noch unklar, beobachten (z.B. vor Earnings)

Bei Watchlist-Items (Position ist noch nicht gehalten): "watch" oder "add" sind die typischen Verdicts; "sell"/"reduce" passen nicht.

WICHTIG: Ergänze und überarbeite, aber lass bestehende User-Notes (separates Feld) unangetastet. Recommendation muss bei jedem Aufruf gesetzt sein.`;

  const input = {
    ticker: position.ticker,
    name: position.name,
    assetClass: position.assetClass,
    currency: position.currency,
    costBasis: position.costBasis,
    currentPrice: position.currentPrice,
    bestehendeDD: {
      thesis: current.thesis,
      strengths: current.strengths,
      risks: current.risks,
      catalysts: current.catalysts,
      fundamentals: current.fundamentals,
      recommendation: current.recommendation,
    },
  };

  const reply = await callClaude({
    system,
    messages: [{ role: 'user', content: `Analysiere diese Position:\n${JSON.stringify(input)}` }],
    apiKey,
    model: MODEL_COACH,
    maxTokens: 2500,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
  });

  const match = reply.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI lieferte kein JSON.');
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch { throw new Error('AI-JSON konnte nicht geparsed werden.'); }

  // Vorschläge bauen – KEIN Merge mehr. User entscheidet pro Feld im Diff-Modal.
  const proposed = {
    thesis: typeof parsed.thesis === 'string' ? parsed.thesis : current.thesis,
    fundamentals: typeof parsed.fundamentals === 'string' ? parsed.fundamentals : current.fundamentals,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : current.strengths,
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : current.risks,
    catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts.map(String) : current.catalysts,
    recommendation: (() => {
      const r = parsed.recommendation && typeof parsed.recommendation === 'object' ? parsed.recommendation : {};
      return {
        verdict: VERDICTS.includes(r.verdict) ? r.verdict : '',
        confidence: ['low', 'medium', 'high'].includes(r.confidence) ? r.confidence : '',
        rationale: typeof r.rationale === 'string' ? r.rationale.slice(0, 240) : '',
        setAt: null, // wird beim Apply gesetzt
      };
    })(),
  };

  return {
    current,
    proposed,
    summary: parsed.summary || (parsed.thesis || '').slice(0, 120),
    model: MODEL_COACH,
  };
}

/* =========================================================
   DD-Diff & Merge
   ========================================================= */

function diffList(before, after) {
  const beforeSet = new Set(before || []);
  const afterSet = new Set(after || []);
  const added = (after || []).filter((x) => !beforeSet.has(x));
  const removed = (before || []).filter((x) => !afterSet.has(x));
  const unchanged = (before || []).filter((x) => afterSet.has(x));
  return { added, removed, unchanged, changed: added.length > 0 || removed.length > 0 };
}

function computeDDDiff(current, proposed) {
  return {
    thesis: { before: current.thesis || '', after: proposed.thesis || '', changed: (current.thesis || '') !== (proposed.thesis || '') },
    fundamentals: { before: current.fundamentals || '', after: proposed.fundamentals || '', changed: (current.fundamentals || '') !== (proposed.fundamentals || '') },
    strengths: diffList(current.strengths, proposed.strengths),
    risks: diffList(current.risks, proposed.risks),
    catalysts: diffList(current.catalysts, proposed.catalysts),
    recommendation: {
      before: current.recommendation || { verdict: '', confidence: '', rationale: '' },
      after: proposed.recommendation || { verdict: '', confidence: '', rationale: '' },
      changed:
        (current.recommendation?.verdict || '') !== (proposed.recommendation?.verdict || '') ||
        (current.recommendation?.confidence || '') !== (proposed.recommendation?.confidence || '') ||
        (current.recommendation?.rationale || '') !== (proposed.recommendation?.rationale || ''),
    },
  };
}

// Wendet pro-Feld-Auswahl auf die DD an und liefert das gemergde Resultat.
// `accepted` = { thesis: bool, fundamentals: bool, strengths: bool, risks: bool, catalysts: bool, recommendation: bool }
function mergeDDDiff(current, proposed, accepted) {
  const next = { ...current };
  if (accepted.thesis) next.thesis = proposed.thesis;
  if (accepted.fundamentals) next.fundamentals = proposed.fundamentals;
  if (accepted.strengths) next.strengths = proposed.strengths;
  if (accepted.risks) next.risks = proposed.risks;
  if (accepted.catalysts) next.catalysts = proposed.catalysts;
  if (accepted.recommendation) {
    next.recommendation = { ...proposed.recommendation, setAt: Date.now() };
  }
  return next;
}

function summarizeDDDiff(diff, acceptedKeys) {
  const parts = [];
  if (acceptedKeys.includes('recommendation') && diff.recommendation.changed) {
    const before = diff.recommendation.before.verdict || '—';
    const after = diff.recommendation.after.verdict || '—';
    parts.push(`recommendation: ${before}→${after}`);
  }
  for (const k of ['strengths', 'risks', 'catalysts']) {
    if (!acceptedKeys.includes(k)) continue;
    const d = diff[k];
    const bits = [];
    if (d.added.length) bits.push(`+${d.added.length} ${k}`);
    if (d.removed.length) bits.push(`-${d.removed.length} ${k}`);
    if (bits.length) parts.push(bits.join(' '));
  }
  if (acceptedKeys.includes('thesis') && diff.thesis.changed) parts.push('thesis ↻');
  if (acceptedKeys.includes('fundamentals') && diff.fundamentals.changed) parts.push('fundamentals ↻');
  return parts.join(' · ') || 'keine Änderungen';
}

function ddFreshness(dd) {
  if (!dd || !dd.lastAnalyzedAt) return 'unknown';
  const days = (Date.now() - dd.lastAnalyzedAt) / 86400000;
  if (days < 30) return 'fresh';
  if (days < 90) return 'stale';
  return 'cold';
}

const FRESHNESS_COLOR = {
  fresh: 'text-green-400',
  stale: 'text-orange-400',
  cold: 'text-red-400',
  unknown: 'text-neutral-600',
};
const FRESHNESS_BG = {
  fresh: 'bg-green-400',
  stale: 'bg-orange-400',
  cold: 'bg-red-400',
  unknown: 'bg-neutral-600',
};

/* =========================================================
   Watchlist-Generator (Themen-Watchlist) & Trending
   ========================================================= */

async function generateWatchlistFromTheme({ theme, count, excludeTickers, apiKey }) {
  if (!apiKey) throw new Error('Anthropic API-Key fehlt (Einstellungen).');
  const n = Math.max(3, Math.min(8, Number(count) || 5));
  const exclude = (excludeTickers || []).join(', ');
  const system = `Du bist ein Equity-Research-Analyst. Schlage konkrete Aktien/ETFs zu einem Investment-Thema vor, recherchiere mit web_search wenn nötig (max 3 Suchen).

Antworte AUSSCHLIESSLICH mit einem validen JSON-Array – kein Markdown, kein Text drumherum:
[{"ticker":"NVDA","name":"NVIDIA","currency":"USD","thesis":"<max 100 Zeichen>"}]

Regeln:
- Realistische Ticker (Yahoo-Schreibweise, z.B. ROG.SW für SIX-Listing).
- Currency exakt einer aus: CHF, USD, EUR, SEK, GBP.
- Genau ${n} Vorschläge.
- KEINE dieser Ticker (User hält / hat schon auf Watchlist): ${exclude || '(keine)'}`;

  const reply = await callClaude({
    system,
    messages: [{ role: 'user', content: `Generiere mir ${n} Investment-Ideen zum Thema: ${theme}` }],
    apiKey,
    model: MODEL_COACH,
    maxTokens: 1800,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
  });
  const match = reply.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI lieferte kein JSON-Array.');
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch { throw new Error('AI-JSON nicht parsebar.'); }
  if (!Array.isArray(parsed)) throw new Error('AI-Antwort ist kein Array.');
  const skip = new Set((excludeTickers || []).map((t) => String(t).toUpperCase()));
  return parsed
    .filter((x) => x && x.ticker && x.name)
    .map((x) => ({
      ticker: String(x.ticker).trim().toUpperCase(),
      name: String(x.name).trim(),
      currency: String(x.currency || 'USD').trim().toUpperCase(),
      thesis: String(x.thesis || '').trim().slice(0, 120),
    }))
    .filter((x) => !skip.has(x.ticker));
}

/* =========================================================
   Google Apps Script Sync
   ========================================================= */

async function gasPush(url, payload) {
  if (!url) throw new Error('Apps-Script-URL fehlt.');
  const r = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action: 'push', ...payload }),
  });
  if (!r.ok) throw new Error(`Push ${r.status}`);
  const d = await r.json();
  if (d?.ok !== true) throw new Error(d?.error || 'Push fehlgeschlagen.');
  return d;
}

async function gasPull(url) {
  if (!url) throw new Error('Apps-Script-URL fehlt.');
  const r = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action: 'pull' }),
  });
  if (!r.ok) throw new Error(`Pull ${r.status}`);
  const d = await r.json();
  if (d?.ok !== true) throw new Error(d?.error || 'Pull fehlgeschlagen.');
  return d.data || {};
}

/* =========================================================
   Helpers
   ========================================================= */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const fmtCHF = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  });

const fmtCcy = (n, ccy) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('de-CH', {
    style: 'currency',
    currency: ccy || 'CHF',
    maximumFractionDigits: 2,
  });

const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(Number.isFinite(n) ? n : 0).toFixed(2)}%`;

const toCHF = (amount, currency, fx) => amount * (fx[currency] ?? 1);

const computePosition = (p, fx) => {
  const mvLocal = p.shares * p.currentPrice;
  const costLocal = p.shares * p.costBasis;
  const plLocal = mvLocal - costLocal;
  const plPct = costLocal > 0 ? (plLocal / costLocal) * 100 : 0;
  const mvCHF = toCHF(mvLocal, p.currency, fx);
  const costCHF = toCHF(costLocal, p.currency, fx);
  const plCHF = mvCHF - costCHF;
  return { ...p, mvLocal, costLocal, plLocal, plPct, mvCHF, costCHF, plCHF };
};

/* =========================================================
   Atomare UI-Elemente
   ========================================================= */

const Card = ({ children, className = '' }) => (
  <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg ${className}`}>
    {children}
  </div>
);

const IconBtn = ({ children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-full hover:bg-neutral-800 active:bg-neutral-700 transition ${className}`}
  >
    {children}
  </button>
);

const Pill = ({ children, color = 'neutral' }) => {
  const map = {
    neutral: 'bg-neutral-800 text-neutral-300',
    accent: 'bg-orange-500/15 text-orange-400',
    green: 'bg-green-500/15 text-green-400',
    red: 'bg-red-500/15 text-red-400',
    blue: 'bg-blue-500/15 text-blue-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[color]}`}>{children}</span>
  );
};

const PerfText = ({ value, suffix = '%', className = '' }) => (
  <span className={`${value >= 0 ? 'text-green-400' : 'text-red-400'} font-medium ${className}`}>
    {value >= 0 ? '+' : ''}
    {value.toFixed(2)}
    {suffix}
  </span>
);

const Spinner = ({ size = 4 }) => (
  <Loader2 className={`animate-spin w-${size} h-${size} text-orange-400`} />
);

const Modal = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-neutral-950 rounded-t-3xl sm:rounded-3xl border border-neutral-800 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <IconBtn onClick={onClose}>
            <X className="w-5 h-5 text-neutral-400" />
          </IconBtn>
        </div>
        <div className="px-5 pb-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 pb-6 pt-2 border-t border-neutral-800 bg-neutral-950 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

const TextField = ({ label, value, onChange, type = 'text', placeholder, step }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-neutral-400 mb-1">{label}</label>
    <input
      type={type}
      step={step}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-neutral-400 mb-1">{label}</label>
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-orange-500"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

const TextArea = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-neutral-400 mb-1">{label}</label>
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 resize-none"
    />
  </div>
);

const PrimaryBtn = ({ children, onClick, disabled, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-black font-semibold py-3 rounded-xl transition ${className}`}
  >
    {children}
  </button>
);

const GhostBtn = ({ children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-xl transition ${className}`}
  >
    {children}
  </button>
);

/* =========================================================
   Dashboard Tab
   ========================================================= */

function VerdictsCard({ portfolio, onOpenByVerdict }) {
  const counts = useMemo(() => {
    const m = { sell: 0, reduce: 0, hold: 0, add: 0, watch: 0, none: 0, cold: 0 };
    for (const p of portfolio) {
      const v = p.dueDiligence?.recommendation?.verdict || '';
      if (v && m[v] != null) m[v]++; else m.none++;
      if (ddFreshness(p.dueDiligence) === 'cold') m.cold++;
    }
    return m;
  }, [portfolio]);

  const rows = [
    { key: 'sell', label: 'Verkaufen', count: counts.sell, color: 'red' },
    { key: 'reduce', label: 'Reduzieren', count: counts.reduce, color: 'accent' },
    { key: 'add', label: 'Nachkaufen', count: counts.add, color: 'green' },
    { key: 'watch', label: 'Beobachten', count: counts.watch, color: 'blue' },
    { key: 'hold', label: 'Halten', count: counts.hold, color: 'neutral' },
  ];
  const hasAny = rows.some((r) => r.count > 0);

  return (
    <Card className="p-5">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Microscope className="w-4 h-4 text-orange-400" /> AI-Verdicts
      </h3>
      {!hasAny ? (
        <p className="text-neutral-500 text-xs">
          Noch keine AI-Empfehlungen. Öffne eine Position und klicke „DD aktualisieren".
        </p>
      ) : (
        <button
          onClick={() => onOpenByVerdict?.()}
          className="w-full text-left"
        >
          <div className="space-y-1.5">
            {rows.filter((r) => r.count > 0).map((r) => (
              <div key={r.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Pill color={r.color}>{VERDICT_EMOJI[r.key]} {r.label}</Pill>
                </span>
                <span className="text-white font-semibold tabular-nums">{r.count}</span>
              </div>
            ))}
            {counts.none > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">— ohne Verdict</span>
                <span className="text-neutral-400 tabular-nums">{counts.none}</span>
              </div>
            )}
          </div>
        </button>
      )}
      {counts.cold > 0 && (
        <p className="text-[11px] text-red-400 mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          {counts.cold} {counts.cold === 1 ? 'Position' : 'Positionen'} mit DD älter als 90 Tage
        </p>
      )}
    </Card>
  );
}

function Dashboard({ portfolio, fx, onAssess, onOpenPortfolioByVerdict }) {
  const computed = useMemo(
    () => portfolio.map((p) => computePosition(p, fx)),
    [portfolio, fx]
  );

  const totalCHF = computed.reduce((s, p) => s + p.mvCHF, 0);
  const totalCostCHF = computed.reduce((s, p) => s + p.costCHF, 0);
  const totalPlCHF = totalCHF - totalCostCHF;
  const totalPlPct = totalCostCHF > 0 ? (totalPlCHF / totalCostCHF) * 100 : 0;

  const byClass = useMemo(() => {
    const m = new Map();
    computed.forEach((p) => m.set(p.assetClass, (m.get(p.assetClass) || 0) + p.mvCHF));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [computed]);

  const byCurrency = useMemo(() => {
    const m = new Map();
    computed.forEach((p) => m.set(p.currency, (m.get(p.currency) || 0) + p.mvCHF));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [computed]);

  const renderDonut = (data) => (
    <div className="w-full h-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={42}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => fmtCHF(v)}
            contentStyle={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #262626',
              borderRadius: 12,
              color: '#fff',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const renderLegend = (data) => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    return (
      <div className="mt-2 space-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
              />
              <span className="text-neutral-300 truncate">{d.name}</span>
            </div>
            <span className="text-neutral-400 tabular-nums">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="px-4 pb-28 pt-4 space-y-4">
      <Card className="p-5">
        <p className="text-neutral-400 text-sm">Total Portfolio</p>
        <p className="text-4xl font-bold text-white mt-1 tabular-nums">{fmtCHF(totalCHF)}</p>
        <div className="flex items-baseline gap-3 mt-1">
          <PerfText value={totalPlPct} />
          <span className={`tabular-nums ${totalPlCHF >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPlCHF >= 0 ? '+' : ''}
            {fmtCHF(totalPlCHF)}
          </span>
        </div>
      </Card>

      <button
        onClick={onAssess}
        className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.99]"
      >
        <Sparkles className="w-5 h-5" />
        Portfolio-Analyse starten
      </button>

      <VerdictsCard portfolio={portfolio} onOpenByVerdict={onOpenPortfolioByVerdict} />

      <Card className="p-5">
        <h3 className="text-white font-semibold mb-2">Asset-Klassen</h3>
        {renderDonut(byClass)}
        {renderLegend(byClass)}
      </Card>

      <Card className="p-5">
        <h3 className="text-white font-semibold mb-2">Währungen</h3>
        {renderDonut(byCurrency)}
        {renderLegend(byCurrency)}
      </Card>
    </div>
  );
}

/* =========================================================
   Portfolio Tab
   ========================================================= */

function PortfolioList({ portfolio, fx, onOpenPosition, onAddPosition, initialSort = 'mv' }) {
  const [sort, setSort] = useState(initialSort);
  useEffect(() => { setSort(initialSort); }, [initialSort]);
  const computed = useMemo(
    () => portfolio.map((p) => computePosition(p, fx)),
    [portfolio, fx]
  );
  const sorted = useMemo(() => {
    const arr = [...computed];
    if (sort === 'mv') arr.sort((a, b) => b.mvCHF - a.mvCHF);
    if (sort === 'perf') arr.sort((a, b) => b.plPct - a.plPct);
    if (sort === 'name') arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'verdict') {
      arr.sort((a, b) => {
        const va = a.dueDiligence?.recommendation?.verdict || '';
        const vb = b.dueDiligence?.recommendation?.verdict || '';
        const ra = VERDICT_RANK[va] ?? 5;
        const rb = VERDICT_RANK[vb] ?? 5;
        if (ra !== rb) return ra - rb;
        return b.mvCHF - a.mvCHF;
      });
    }
    return arr;
  }, [computed, sort]);

  return (
    <div className="px-4 pb-28 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {[
            { v: 'mv', l: 'Wert' },
            { v: 'perf', l: 'Perf.' },
            { v: 'name', l: 'Name' },
            { v: 'verdict', l: 'Verdict' },
          ].map((b) => (
            <button
              key={b.v}
              onClick={() => setSort(b.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                sort === b.v
                  ? 'bg-orange-500 text-black'
                  : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {b.l}
            </button>
          ))}
        </div>
        <button
          onClick={onAddPosition}
          className="flex items-center gap-1 bg-orange-500 text-black font-semibold px-3 py-1.5 rounded-full text-sm"
        >
          <Plus className="w-4 h-4" /> Neue
        </button>
      </div>

      {sorted.map((p) => {
        const verdict = p.dueDiligence?.recommendation?.verdict || '';
        const fresh = ddFreshness(p.dueDiligence);
        const ageDays = p.dueDiligence?.lastAnalyzedAt
          ? Math.round((Date.now() - p.dueDiligence.lastAnalyzedAt) / 86400000)
          : null;
        return (
        <button
          key={p.id}
          onClick={() => onOpenPosition(p.id)}
          className="w-full text-left"
        >
          <Card className="p-4 active:bg-neutral-800/60 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold truncate">{p.name}</p>
                  <Pill>{p.currency}</Pill>
                  {verdict && (
                    <Pill color={VERDICT_COLOR[verdict]}>
                      {VERDICT_EMOJI[verdict]} {VERDICT_LABEL[verdict]}
                    </Pill>
                  )}
                </div>
                <p className="text-neutral-500 text-xs mt-0.5">
                  {p.ticker} · {p.shares} × {fmtCcy(p.currentPrice, p.currency)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-white font-semibold tabular-nums">
                  {fmtCHF(p.mvCHF)}
                </p>
                <PerfText value={p.plPct} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-neutral-500 gap-3">
              <span>Einstand {fmtCcy(p.costBasis, p.currency)}</span>
              <span className={p.plLocal >= 0 ? 'text-green-400' : 'text-red-400'}>
                {p.plLocal >= 0 ? '+' : ''}
                {fmtCcy(p.plLocal, p.currency)}
              </span>
              <span
                className={`flex items-center gap-1 ${FRESHNESS_COLOR[fresh]}`}
                title={ageDays != null ? `DD vor ${ageDays} Tagen` : 'Noch keine AI-Analyse'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${FRESHNESS_BG[fresh]}`} />
                DD {ageDays != null ? `${ageDays}d` : '—'}
              </span>
            </div>
          </Card>
        </button>
        );
      })}

      {sorted.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-neutral-400">Noch keine Positionen. Tippe oben rechts auf <span className="text-orange-400">+ Neue</span>.</p>
        </Card>
      )}
    </div>
  );
}

/* =========================================================
   Due-Diligence UI
   ========================================================= */

function BulletEditor({ label, items, onChange, placeholder, accent = 'neutral' }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...(items || []), v]);
    setDraft('');
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, v) => onChange(items.map((it, idx) => (idx === i ? v : it)));
  const dotColor = {
    neutral: 'bg-neutral-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
  }[accent] || 'bg-neutral-500';

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-neutral-400 mb-1.5">{label}</label>
      <div className="space-y-1.5">
        {(items || []).map((it, i) => (
          <div key={i} className="flex items-start gap-2 group">
            <span className={`w-1.5 h-1.5 rounded-full mt-2.5 shrink-0 ${dotColor}`} />
            <input
              type="text"
              value={it}
              onChange={(e) => update(i, e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={() => remove(i)}
              className="text-neutral-600 hover:text-red-400 p-1 mt-0.5 opacity-60 group-hover:opacity-100 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} opacity-30`} />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder={placeholder || `+ ${label.toLowerCase()} hinzufügen`}
            className="flex-1 bg-neutral-900/50 border border-dashed border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-orange-500"
          />
          {draft && (
            <button
              onClick={add}
              className="text-orange-400 p-1"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationBubble({ rec, model }) {
  const v = rec?.verdict || '';
  if (!v) {
    return (
      <div className="mb-3 bg-neutral-900/60 border border-dashed border-neutral-800 rounded-xl p-3 text-xs text-neutral-500">
        Noch keine AI-Empfehlung. Klicke <span className="text-orange-400">„DD aktualisieren"</span>, damit der Coach einen Verdict liefert.
      </div>
    );
  }
  const setAtDays = rec.setAt ? Math.round((Date.now() - rec.setAt) / 86400000) : null;
  const accent = {
    sell: 'bg-red-500/15 border-red-500/40 text-red-300',
    reduce: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
    hold: 'bg-neutral-700/40 border-neutral-600 text-neutral-200',
    add: 'bg-green-500/15 border-green-500/40 text-green-300',
    watch: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
  }[v];
  return (
    <div className={`mb-3 border rounded-xl p-3 ${accent}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-semibold text-sm">
          {VERDICT_EMOJI[v]} {VERDICT_LABEL[v].toUpperCase()}
          {rec.confidence && <span className="text-xs font-normal opacity-80"> · {rec.confidence}</span>}
        </p>
        {setAtDays != null && (
          <span className="text-[10px] opacity-70">
            vor {setAtDays === 0 ? 'heute' : `${setAtDays}d`}
          </span>
        )}
      </div>
      {rec.rationale && <p className="text-xs opacity-90">{rec.rationale}</p>}
    </div>
  );
}

function DueDiligenceEditor({ position, onUpdate, apiKey }) {
  const [dd, setDd] = useState(() => ensureDD(position));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [diffState, setDiffState] = useState(null); // { current, proposed, diff, summary, model }

  // Sync wenn Position von außen wechselt
  useEffect(() => { setDd(ensureDD(position)); }, [position.id]);

  const setField = (k, v) => setDd((d) => ({ ...d, [k]: v }));

  const save = () => {
    onUpdate({ ...position, dueDiligence: dd, note: dd.thesis || position.note || '' });
  };

  const runDeepAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const { current, proposed, summary, model } = await analyzePositionDeep(position, { apiKey });
      // userNotes/tags aus aktuellem (vielleicht ungespeichertem) Local-State holen
      const liveCurrent = { ...current, userNotes: dd.userNotes, tags: dd.tags };
      const diff = computeDDDiff(liveCurrent, proposed);
      setDiffState({ current: liveCurrent, proposed, diff, summary, model });
    } catch (e) {
      setError(e.message || 'Deep-Analyse fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const applyDiff = (acceptedKeys) => {
    if (!diffState) return;
    const { current, proposed, diff, summary, model } = diffState;
    const acceptedFlags = {
      thesis: acceptedKeys.includes('thesis'),
      fundamentals: acceptedKeys.includes('fundamentals'),
      strengths: acceptedKeys.includes('strengths'),
      risks: acceptedKeys.includes('risks'),
      catalysts: acceptedKeys.includes('catalysts'),
      recommendation: acceptedKeys.includes('recommendation'),
    };
    const merged = mergeDDDiff(current, proposed, acceptedFlags);
    merged.lastAnalyzedAt = Date.now();
    merged.lastAnalysisModel = model;
    const histSummary = summarizeDDDiff(diff, acceptedKeys);
    const withHistory = appendDDHistory(merged, {
      ts: Date.now(),
      source: 'deep',
      summary: `${histSummary}${summary ? ` — ${summary}` : ''}`.slice(0, 200),
      model,
    });
    setDd(withHistory);
    onUpdate({ ...position, dueDiligence: withHistory, note: withHistory.thesis || position.note || '' });
    setDiffState(null);
  };

  const fresh = ddFreshness(dd);
  const ago = dd.lastAnalyzedAt
    ? Math.max(0, Math.round((Date.now() - dd.lastAnalyzedAt) / 60000))
    : null;
  const agoLabel = !dd.lastAnalyzedAt
    ? 'Noch keine AI-Analyse'
    : ago < 60 ? `AI-Analyse: vor ${ago} Min`
    : ago < 60 * 24 ? `AI-Analyse: vor ${Math.round(ago / 60)} h`
    : `AI-Analyse: vor ${Math.round(ago / 60 / 24)} Tagen`;

  return (
    <Card className="p-4 transition">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <h4 className="text-white font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" /> Due Diligence
          </h4>
          <p className={`text-[11px] mt-0.5 flex items-center gap-1.5 ${FRESHNESS_COLOR[fresh]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${FRESHNESS_BG[fresh]}`} />
            {agoLabel}
          </p>
        </div>
        <button
          onClick={runDeepAnalysis}
          disabled={loading || !apiKey}
          title={!apiKey ? 'Anthropic API-Key in Einstellungen' : ''}
          className="flex items-center gap-1.5 bg-orange-500/15 hover:bg-orange-500/25 disabled:opacity-40 text-orange-400 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0"
        >
          {loading ? <Spinner size={3} /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'Analysiere…' : 'DD aktualisieren'}
        </button>
      </div>

      {error && (
        <div className="mb-3 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <RecommendationBubble rec={dd.recommendation} model={dd.lastAnalysisModel} />

      <TextArea
        label="Thesis"
        value={dd.thesis}
        onChange={(v) => setField('thesis', v)}
        placeholder="Warum hältst du diese Position?"
        rows={2}
      />

      <BulletEditor
        label="Stärken"
        items={dd.strengths}
        onChange={(v) => setField('strengths', v)}
        accent="green"
        placeholder="+ Stärke hinzufügen"
      />
      <BulletEditor
        label="Risiken"
        items={dd.risks}
        onChange={(v) => setField('risks', v)}
        accent="red"
        placeholder="+ Risiko hinzufügen"
      />
      <BulletEditor
        label="Catalysts (Events / Earnings)"
        items={dd.catalysts}
        onChange={(v) => setField('catalysts', v)}
        accent="orange"
        placeholder="+ z.B. Q4-Earnings 28.02.2026"
      />

      <TextArea
        label="Fundamentals (P/E, Margen, Verschuldung…)"
        value={dd.fundamentals}
        onChange={(v) => setField('fundamentals', v)}
        placeholder="Frei: KGV 18, Op-Marge 28%, Net Debt/EBITDA 1.2x…"
        rows={3}
      />

      <TextArea
        label="Eigene Notizen (AI fasst diese NIE an)"
        value={dd.userNotes}
        onChange={(v) => setField('userNotes', v)}
        placeholder="Dein eigener Knowledge-Layer."
        rows={2}
      />

      {(dd.history || []).length > 0 && (
        <button
          onClick={() => setHistoryOpen((x) => !x)}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 mt-2 mb-2"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${historyOpen ? 'rotate-90' : ''}`} />
          Analyse-Historie ({dd.history.length})
        </button>
      )}
      {historyOpen && (
        <div className="space-y-2 mb-3">
          {dd.history.map((h, i) => {
            const d = new Date(h.ts);
            return (
              <div key={i} className="text-xs bg-neutral-900/60 border border-neutral-800 rounded-lg p-2">
                <div className="flex items-center justify-between text-neutral-500 mb-1">
                  <span>{d.toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <Pill color={h.source === 'deep' ? 'accent' : h.source === 'assessment' ? 'blue' : 'neutral'}>
                    {h.source === 'deep' ? 'Deep' : h.source === 'assessment' ? 'Assess' : 'Manual'}
                  </Pill>
                </div>
                <p className="text-neutral-300">{h.summary}</p>
              </div>
            );
          })}
        </div>
      )}

      <PrimaryBtn onClick={save}>DD speichern</PrimaryBtn>

      {diffState && (
        <DDDiffModal
          diff={diffState.diff}
          current={diffState.current}
          proposed={diffState.proposed}
          onClose={() => setDiffState(null)}
          onApply={applyDiff}
        />
      )}
    </Card>
  );
}

/* =========================================================
   DD Diff Modal
   ========================================================= */

function DDDiffModal({ diff, current, proposed, onClose, onApply }) {
  // Pre-select all changed blocks. Unchanged blocks aren't toggleable (no-op).
  const initial = {
    thesis: diff.thesis.changed,
    fundamentals: diff.fundamentals.changed,
    strengths: diff.strengths.changed,
    risks: diff.risks.changed,
    catalysts: diff.catalysts.changed,
    recommendation: diff.recommendation.changed,
  };
  const [accepted, setAccepted] = useState(initial);
  const anyChanged = Object.values(initial).some(Boolean);

  const toggle = (k) => setAccepted((s) => ({ ...s, [k]: !s[k] }));
  const setAll = (val) => setAccepted({
    thesis: val && diff.thesis.changed,
    fundamentals: val && diff.fundamentals.changed,
    strengths: val && diff.strengths.changed,
    risks: val && diff.risks.changed,
    catalysts: val && diff.catalysts.changed,
    recommendation: val && diff.recommendation.changed,
  });

  const acceptedKeys = Object.entries(accepted).filter(([, v]) => v).map(([k]) => k);

  const renderTextDiff = (key, label, d) => {
    if (!d.changed) {
      return (
        <div className="mb-3 opacity-50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">{label} (unverändert)</p>
          <p className="text-xs text-neutral-400 whitespace-pre-wrap">{d.after || '—'}</p>
        </div>
      );
    }
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-400">{label} · geändert</p>
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-400 select-none">
            <input type="checkbox" checked={!!accepted[key]} onChange={() => toggle(key)} className="accent-orange-500" />
            übernehmen
          </label>
        </div>
        <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-2 mb-1">
          <p className="text-[10px] text-red-400 mb-0.5">vorher</p>
          <p className="text-xs text-neutral-300 whitespace-pre-wrap">{d.before || '—'}</p>
        </div>
        <div className="bg-green-950/20 border border-green-500/20 rounded-lg p-2">
          <p className="text-[10px] text-green-400 mb-0.5">nachher</p>
          <p className="text-xs text-neutral-200 whitespace-pre-wrap">{d.after || '—'}</p>
        </div>
      </div>
    );
  };

  const renderListDiff = (key, label, d) => {
    if (!d.changed && d.unchanged.length === 0) {
      return (
        <div className="mb-3 opacity-50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">{label} (leer)</p>
        </div>
      );
    }
    if (!d.changed) {
      return (
        <div className="mb-3 opacity-50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">{label} (unverändert · {d.unchanged.length})</p>
          <ul className="text-xs text-neutral-400 space-y-0.5">
            {d.unchanged.map((it, i) => <li key={i}>• {it}</li>)}
          </ul>
        </div>
      );
    }
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-400">
            {label} · +{d.added.length} / −{d.removed.length}
          </p>
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-400 select-none">
            <input type="checkbox" checked={!!accepted[key]} onChange={() => toggle(key)} className="accent-orange-500" />
            übernehmen
          </label>
        </div>
        <ul className="text-xs space-y-0.5">
          {d.added.map((it, i) => (
            <li key={`a${i}`} className="text-green-300"><span className="text-green-500">+</span> {it}</li>
          ))}
          {d.removed.map((it, i) => (
            <li key={`r${i}`} className="text-red-400 line-through opacity-70"><span>−</span> {it}</li>
          ))}
          {d.unchanged.map((it, i) => (
            <li key={`u${i}`} className="text-neutral-500">• {it}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderRecommendationDiff = () => {
    const d = diff.recommendation;
    const before = d.before;
    const after = d.after;
    if (!d.changed) {
      return (
        <div className="mb-3 opacity-50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">Verdict (unverändert)</p>
          <p className="text-xs text-neutral-400">{after.verdict ? `${VERDICT_EMOJI[after.verdict]} ${VERDICT_LABEL[after.verdict]}` : '—'}</p>
        </div>
      );
    }
    const colorClass = {
      sell: 'border-red-500/40 bg-red-500/10',
      reduce: 'border-orange-500/40 bg-orange-500/10',
      hold: 'border-neutral-600 bg-neutral-700/30',
      add: 'border-green-500/40 bg-green-500/10',
      watch: 'border-blue-500/40 bg-blue-500/10',
    }[after.verdict] || 'border-neutral-700 bg-neutral-900/40';
    return (
      <div className={`mb-3 border rounded-xl p-3 ${colorClass}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-300">Verdict · geändert</p>
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-200 select-none">
            <input type="checkbox" checked={!!accepted.recommendation} onChange={() => toggle('recommendation')} className="accent-orange-500" />
            übernehmen
          </label>
        </div>
        <p className="text-sm text-neutral-200 mb-1">
          {before.verdict ? `${VERDICT_EMOJI[before.verdict]} ${VERDICT_LABEL[before.verdict]}` : '— kein Verdict —'}
          {' '}<span className="text-neutral-500">→</span>{' '}
          <span className="font-semibold">{after.verdict ? `${VERDICT_EMOJI[after.verdict]} ${VERDICT_LABEL[after.verdict]}` : '—'}</span>
          {after.confidence && <span className="text-xs text-neutral-400"> · {after.confidence}</span>}
        </p>
        {after.rationale && <p className="text-xs text-neutral-300">{after.rationale}</p>}
      </div>
    );
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="DD-Vorschlag prüfen"
      footer={
        <div className="space-y-2">
          {!anyChanged && (
            <p className="text-xs text-neutral-400 text-center">Keine Änderungen vorgeschlagen.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <GhostBtn onClick={onClose}>Verwerfen</GhostBtn>
            <PrimaryBtn
              onClick={() => onApply(acceptedKeys)}
              disabled={acceptedKeys.length === 0}
            >
              {acceptedKeys.length === 0 ? 'Nichts gewählt' : `${acceptedKeys.length} ${acceptedKeys.length === 1 ? 'Block' : 'Blöcke'} anwenden`}
            </PrimaryBtn>
          </div>
          <div className="flex justify-center gap-3 text-[11px] text-neutral-500">
            <button onClick={() => setAll(true)} className="hover:text-neutral-200">Alle ankreuzen</button>
            <span>·</span>
            <button onClick={() => setAll(false)} className="hover:text-neutral-200">Keine</button>
          </div>
        </div>
      }
    >
      {renderRecommendationDiff()}
      {renderTextDiff('thesis', 'Thesis', diff.thesis)}
      {renderListDiff('risks', 'Risiken', diff.risks)}
      {renderListDiff('strengths', 'Stärken', diff.strengths)}
      {renderListDiff('catalysts', 'Catalysts', diff.catalysts)}
      {renderTextDiff('fundamentals', 'Fundamentals', diff.fundamentals)}
    </Modal>
  );
}

/* =========================================================
   Position-Detail-Modal
   ========================================================= */

function PositionDetail({ position, fx, onClose, onUpdate, onDelete, apiKey, onUpdateWithCascade }) {
  const p = computePosition(position, fx);

  // Anteile anpassen (collapsed)
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState('add'); // 'add' | 'sell'
  const [adjShares, setAdjShares] = useState('');
  const [adjPrice, setAdjPrice] = useState(String(position.currentPrice ?? ''));
  const [adjError, setAdjError] = useState('');

  // Stammdaten-Edit (collapsed)
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({
    ticker: position.ticker,
    name: position.name,
    assetClass: position.assetClass,
    currency: position.currency,
    purchaseDate: position.purchaseDate || '',
    shares: String(position.shares),
    costBasis: String(position.costBasis),
  });
  const [editError, setEditError] = useState('');

  const saveEdit = () => {
    setEditError('');
    const newTicker = String(edit.ticker || '').trim().toUpperCase();
    const newShares = parseFloat(edit.shares);
    const newCost = parseFloat(edit.costBasis);
    if (!newTicker) return setEditError('Ticker fehlt.');
    if (!edit.name.trim()) return setEditError('Name fehlt.');
    if (!Number.isFinite(newShares) || newShares < 0) return setEditError('Anzahl ungültig.');
    if (!Number.isFinite(newCost) || newCost < 0) return setEditError('Einstand ungültig.');
    if (newShares === 0) {
      if (!confirm(`Anzahl = 0 → Position ${position.name} löschen?`)) return;
      onDelete(position.id);
      onClose();
      return;
    }
    const tickerChanged = newTicker !== position.ticker;
    const currencyChanged = edit.currency !== position.currency;
    const next = {
      ...position,
      ticker: newTicker,
      name: edit.name.trim(),
      assetClass: edit.assetClass,
      currency: edit.currency,
      purchaseDate: edit.purchaseDate,
      shares: newShares,
      costBasis: newCost,
      resolvedTicker: tickerChanged || currencyChanged ? null : position.resolvedTicker,
    };
    if (tickerChanged || currencyChanged) {
      try { quoteCache.delete(normalizeTicker(position.ticker)); } catch {}
    }
    if (onUpdateWithCascade && newTicker !== position.ticker) {
      onUpdateWithCascade(next, position.ticker);
    } else {
      onUpdate(next);
    }
    setEditOpen(false);
  };

  const switchAdjustMode = (mode) => {
    setAdjustMode(mode);
    setAdjError('');
    setAdjShares('');
    setAdjPrice(String(position.currentPrice ?? ''));
  };

  const submitAdjust = () => {
    setAdjError('');
    const sh = parseFloat(adjShares);
    const pr = parseFloat(adjPrice);
    if (!Number.isFinite(sh) || sh <= 0) return setAdjError('Anzahl ungültig.');
    if (!Number.isFinite(pr) || pr <= 0) return setAdjError('Kurs ungültig.');

    if (adjustMode === 'add') {
      const newShares = position.shares + sh;
      const newCost = (position.shares * position.costBasis + sh * pr) / newShares;
      const updated = { ...position, shares: newShares, costBasis: newCost };
      updated.dueDiligence = appendDDHistory(ensureDD(updated), {
        ts: Date.now(),
        source: 'manual',
        summary: `+${sh} @ ${pr} ${position.currency} → ${newShares.toFixed(2)} Stk, Einstand ${newCost.toFixed(2)}`,
        model: '',
      });
      onUpdate(updated);
    } else {
      if (sh > position.shares + 1e-9) return setAdjError(`Maximal ${position.shares} Stück.`);
      const isFull = sh >= position.shares - 1e-9;
      if (isFull) {
        if (!confirm(`Position ${position.name} komplett auflösen?`)) return;
        onDelete(position.id);
        onClose();
        return;
      }
      const remaining = position.shares - sh;
      const updated = { ...position, shares: remaining };
      updated.dueDiligence = appendDDHistory(ensureDD(updated), {
        ts: Date.now(),
        source: 'manual',
        summary: `-${sh} @ ${pr} ${position.currency} → ${remaining.toFixed(2)} Stk`,
        model: '',
      });
      onUpdate(updated);
    }
    setAdjShares('');
    setAdjustOpen(false);
  };

  const adjPreview = (() => {
    const sh = parseFloat(adjShares);
    const pr = parseFloat(adjPrice);
    if (!Number.isFinite(sh) || sh <= 0 || !Number.isFinite(pr) || pr <= 0) return null;
    if (adjustMode === 'add') {
      const newShares = position.shares + sh;
      const newCost = (position.shares * position.costBasis + sh * pr) / newShares;
      return `Neu: ${newShares.toFixed(2)} Stk · Einstand ${newCost.toFixed(2)} ${position.currency}`;
    }
    const remaining = Math.max(0, position.shares - sh);
    const realized = (pr - position.costBasis) * sh;
    return `Verbleibend: ${remaining.toFixed(2)} Stk · realisiert ${realized >= 0 ? '+' : ''}${fmtCcy(realized, position.currency)}${sh >= position.shares - 1e-9 ? ' · Position wird gelöscht' : ''}`;
  })();

  const quoteStatus = (position.resolvedTicker && position.resolvedTicker !== position.ticker) || position.quoteSource || position.lastQuoteAt
    ? [
        position.resolvedTicker && position.resolvedTicker !== position.ticker ? position.resolvedTicker : null,
        position.quoteSource ? position.quoteSource : null,
        position.lastQuoteAt ? `vor ${Math.max(0, Math.round((Date.now() - position.lastQuoteAt) / 60000))} min` : null,
      ].filter(Boolean).join(' · ')
    : null;

  return (
    <Modal open={true} onClose={onClose} title={position.name}>
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-neutral-500 text-xs">{position.ticker} · {position.assetClass} · {position.currency}</p>
              <p className="text-2xl font-bold text-white tabular-nums mt-1">{fmtCHF(p.mvCHF)}</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <PerfText value={p.plPct} />
                <span className="text-neutral-500 text-xs">{position.shares} × {fmtCcy(position.currentPrice, position.currency)} · Einstand {fmtCcy(position.costBasis, position.currency)}</span>
              </div>
              {quoteStatus && <p className="mt-2 text-[10px] text-neutral-500">{quoteStatus}</p>}
            </div>
          </div>
        </Card>

        <DueDiligenceEditor position={position} onUpdate={onUpdate} apiKey={apiKey} />

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-semibold text-sm">Anteile anpassen</h4>
            <button
              onClick={() => setAdjustOpen((x) => !x)}
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
            >
              <Plus className="w-3.5 h-3.5" /> {adjustOpen ? 'Schliessen' : 'Öffnen'}
            </button>
          </div>
          {!adjustOpen ? (
            <p className="text-neutral-500 text-xs">Aufstocken (Cost-Basis wird gemittelt) oder reduzieren / komplett auflösen.</p>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                {[
                  { v: 'add', l: 'Aufstocken' },
                  { v: 'sell', l: 'Reduzieren' },
                ].map((b) => (
                  <button
                    key={b.v}
                    onClick={() => switchAdjustMode(b.v)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      adjustMode === b.v
                        ? 'bg-orange-500 text-black'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {b.l}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Anzahl" type="number" step="0.0001" value={adjShares} onChange={setAdjShares} />
                <TextField label={`Kurs (${position.currency})`} type="number" step="0.01" value={adjPrice} onChange={setAdjPrice} />
              </div>
              {adjPreview && <p className="text-[11px] text-neutral-400 mb-2">{adjPreview}</p>}
              {adjError && (
                <div className="mb-2 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {adjError}
                </div>
              )}
              <PrimaryBtn onClick={submitAdjust} disabled={!adjShares || !adjPrice}>
                {adjustMode === 'add' ? 'Aufstocken' : 'Reduzieren'}
              </PrimaryBtn>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-semibold text-sm">Stammdaten</h4>
            <button
              onClick={() => setEditOpen((x) => !x)}
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
            >
              <Pencil className="w-3.5 h-3.5" /> {editOpen ? 'Schliessen' : 'Bearbeiten'}
            </button>
          </div>
          {!editOpen ? (
            <p className="text-neutral-500 text-xs">{position.ticker} · {position.assetClass} · {position.currency} · {position.purchaseDate || '—'}</p>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Ticker" value={edit.ticker} onChange={(v) => setEdit({ ...edit, ticker: v })} placeholder="NOVN.SW" />
                <SelectField label="Asset-Klasse" value={edit.assetClass} onChange={(v) => setEdit({ ...edit, assetClass: v })} options={ASSET_CLASSES} />
              </div>
              <TextField label="Name" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Währung" value={edit.currency} onChange={(v) => setEdit({ ...edit, currency: v })} options={CURRENCIES} />
                <TextField label="Kaufdatum" type="date" value={edit.purchaseDate} onChange={(v) => setEdit({ ...edit, purchaseDate: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Anzahl" type="number" step="0.0001" value={edit.shares} onChange={(v) => setEdit({ ...edit, shares: v })} />
                <TextField label={`Einstand (${edit.currency})`} type="number" step="0.01" value={edit.costBasis} onChange={(v) => setEdit({ ...edit, costBasis: v })} />
              </div>
              {edit.ticker.trim().toUpperCase() !== position.ticker && (
                <p className="text-[11px] text-orange-300 mb-2">Ticker ändert sich → Kurs wird beim nächsten Refresh neu geholt.</p>
              )}
              {edit.currency !== position.currency && (
                <p className="text-[11px] text-orange-300 mb-2">Währung ändert sich → Kurs in neuer Währung wird beim nächsten Refresh geholt.</p>
              )}
              {editError && (
                <div className="mb-2 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {editError}
                </div>
              )}
              <PrimaryBtn onClick={saveEdit}>Stammdaten speichern</PrimaryBtn>
            </div>
          )}
        </Card>

        <button
          onClick={() => {
            if (confirm(`${position.name} wirklich löschen?`)) {
              onDelete(position.id);
              onClose();
            }
          }}
          className="w-full text-red-400 border border-red-500/40 hover:bg-red-500/10 py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Position löschen
        </button>
      </div>
    </Modal>
  );
}

/* =========================================================
   Add Position Modal
   ========================================================= */

function AddPositionModal({ open, onClose, onAddMany, apiKey, finnhubKey }) {
  const [form, setForm] = useState({ ticker: '', shares: '', costBasis: '', currency: 'auto' });
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addDraft = () => {
    setError('');
    const ticker = form.ticker.trim();
    const shares = parseFloat(form.shares);
    const costBasis = parseFloat(form.costBasis);
    if (!ticker || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(costBasis) || costBasis <= 0) {
      setError('Ticker, Anzahl und Einstand sind Pflicht.');
      return;
    }
    setDrafts((arr) => [
      ...arr,
      {
        tempId: uid(),
        ticker: ticker.toUpperCase(),
        shares,
        costBasis,
        currency: form.currency === 'auto' ? null : form.currency,
      },
    ]);
    setForm({ ticker: '', shares: '', costBasis: '', currency: form.currency });
  };

  const removeDraft = (id) => setDrafts((arr) => arr.filter((d) => d.tempId !== id));

  const closeAndReset = () => {
    if (loading) return;
    setDrafts([]);
    setForm({ ticker: '', shares: '', costBasis: '', currency: 'auto' });
    setError('');
    onClose();
  };

  const commit = async () => {
    if (drafts.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const positions = await enrichDrafts(drafts, { apiKey, finnhubKey, onProgress: setProgress });
      onAddMany(positions);
      setDrafts([]);
      setForm({ ticker: '', shares: '', costBasis: '', currency: 'auto' });
      onClose();
    } catch (e) {
      setError(e.message || 'Konnte Drafts nicht vervollständigen.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const canAddDraft = form.ticker.trim() && form.shares && form.costBasis;

  return (
    <Modal
      open={open}
      onClose={closeAndReset}
      title="Neue Positionen"
      footer={
        <div className="space-y-2">
          {error && (
            <div className="text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center gap-2 text-orange-400 text-sm py-1">
              <Spinner size={4} />
              <span>{progress || 'Vervollständige…'}</span>
            </div>
          )}
          <PrimaryBtn onClick={commit} disabled={loading || drafts.length === 0}>
            {drafts.length === 0
              ? 'Erst Drafts hinzufügen'
              : `${drafts.length} ${drafts.length === 1 ? 'Position' : 'Positionen'} mit AI vervollständigen`}
          </PrimaryBtn>
        </div>
      }
    >
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 mb-3">
        <p className="text-xs text-neutral-400 mb-3">
          Nur das Nötigste eingeben. Name, Kurs, Asset-Klasse & These holt die AI per Yahoo/Finnhub-Daten in einem Rutsch.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Ticker"
            value={form.ticker}
            onChange={(v) => set('ticker', v)}
            placeholder="NOVN, AAPL, ROG.SW"
          />
          <SelectField
            label="Währung"
            value={form.currency}
            onChange={(v) => set('currency', v)}
            options={['auto', ...CURRENCIES]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Anzahl"
            type="number"
            step="0.0001"
            value={form.shares}
            onChange={(v) => set('shares', v)}
          />
          <TextField
            label="Einstand / Stück"
            type="number"
            step="0.01"
            value={form.costBasis}
            onChange={(v) => set('costBasis', v)}
          />
        </div>
        <button
          onClick={addDraft}
          disabled={!canAddDraft || loading}
          className="w-full mt-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition"
        >
          <Plus className="w-4 h-4" /> Zu Drafts hinzufügen
        </button>
      </div>

      {drafts.length > 0 && (
        <div className="space-y-2 mb-2">
          <p className="text-xs text-neutral-400 font-medium px-1">
            Drafts ({drafts.length}) – werden in einem AI-Call vervollständigt
          </p>
          {drafts.map((d) => (
            <div
              key={d.tempId}
              className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-white text-sm font-medium">{d.ticker}</p>
                <p className="text-neutral-500 text-xs">
                  {d.shares} × {d.costBasis} {d.currency || 'auto'}
                </p>
              </div>
              <button onClick={() => removeDraft(d.tempId)} disabled={loading}>
                <X className="w-4 h-4 text-neutral-500 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* =========================================================
   Watchlist Tab
   ========================================================= */

function WatchlistTab({ watchlist, portfolio, onAdd, onAddMany, onRemove, onUpdate, onConvert, apiKey }) {
  const [showAdd, setShowAdd] = useState(false);
  const [convertItem, setConvertItem] = useState(null);
  const [ddItem, setDdItem] = useState(null);

  return (
    <div className="px-4 pb-28 pt-4 space-y-3">
      <WatchlistGeneratorCard
        portfolio={portfolio}
        watchlist={watchlist}
        apiKey={apiKey}
        onAddMany={onAddMany}
      />

      <button
        onClick={() => setShowAdd(true)}
        className="w-full bg-orange-500 text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Manuell hinzufügen
      </button>

      {watchlist.map((w) => {
        const hasTrigger = w.triggerPrice != null && w.currentPrice != null && w.currentPrice > 0;
        const triggerHit = hasTrigger && w.currentPrice <= w.triggerPrice;
        const nearTrigger = hasTrigger && !triggerHit && w.currentPrice <= w.triggerPrice * 1.05;
        const borderAccent = triggerHit ? 'border-green-500/40' : nearTrigger ? 'border-orange-500/30' : '';
        return (
        <Card key={w.id} className={`p-4 ${borderAccent ? `border ${borderAccent}` : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-semibold">{w.name}</p>
                <Pill color={w.source === 'ai' ? 'accent' : 'blue'}>
                  {w.source === 'ai' ? 'vom AI' : 'von mir'}
                </Pill>
                {w.dueDiligence?.lastAnalyzedAt && (
                  <Pill color="green">DD ✓</Pill>
                )}
                {triggerHit && <Pill color="green">🎯 Trigger erreicht</Pill>}
                {nearTrigger && <Pill color="accent">nahe Trigger</Pill>}
              </div>
              <p className="text-neutral-500 text-xs mt-0.5">{w.ticker} · {w.currency}</p>
              {(w.triggerPrice != null || w.currentPrice != null) && (
                <p className="text-neutral-300 text-sm mt-1">
                  {w.currentPrice != null && <>Kurs: {fmtCcy(w.currentPrice, w.currency)}{' '}</>}
                  {w.triggerPrice != null && <span className="text-neutral-500">· Trigger: {fmtCcy(w.triggerPrice, w.currency)}</span>}
                </p>
              )}
              {w.thesis && (
                <p className="text-neutral-400 text-sm mt-1 italic">„{w.thesis}"</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => setConvertItem(w)}
                className="bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-lg text-xs font-medium"
              >
                Kaufen
              </button>
              <button
                onClick={() => setDdItem(w)}
                className="bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
              >
                <Microscope className="w-3 h-3" /> DD
              </button>
              <button onClick={() => onRemove(w.id)} className="p-1 self-center">
                <Trash2 className="w-4 h-4 text-neutral-500 hover:text-red-400" />
              </button>
            </div>
          </div>
        </Card>
        );
      })}

      {watchlist.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-neutral-400">Watchlist leer.</p>
        </Card>
      )}

      <AddWatchlistModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={onAdd} />
      {convertItem && (
        <ConvertToPositionModal
          item={convertItem}
          onClose={() => setConvertItem(null)}
          onConfirm={(pos) => {
            onConvert(convertItem.id, pos);
            setConvertItem(null);
          }}
        />
      )}
      {ddItem && (
        <WatchlistDDModal
          item={ddItem}
          apiKey={apiKey}
          onClose={() => setDdItem(null)}
          onUpdate={(updated) => onUpdate(updated)}
        />
      )}
    </div>
  );
}

function WatchlistGeneratorCard({ portfolio, watchlist, apiKey, onAddMany }) {
  const [theme, setTheme] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  const generate = async () => {
    if (!theme.trim()) return;
    setLoading(true);
    setErr('');
    try {
      const exclude = [
        ...portfolio.map((p) => p.ticker.toUpperCase()),
        ...watchlist.map((w) => w.ticker.toUpperCase()),
      ];
      const items = await generateWatchlistFromTheme({
        theme: theme.trim(),
        count,
        excludeTickers: exclude,
        apiKey,
      });
      if (items.length === 0) {
        setErr('Keine neuen Vorschläge (alle bereits bekannt?).');
      } else {
        onAddMany(items.map((x) => ({
          id: uid(),
          ticker: x.ticker,
          name: x.name,
          triggerPrice: null,
          currency: x.currency,
          thesis: x.thesis,
          source: 'ai',
          addedAt: new Date().toISOString(),
          dueDiligence: { ...emptyDD(), thesis: x.thesis },
        })));
        setTheme('');
      }
    } catch (e) {
      setErr(e.message || 'Generieren fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white font-semibold flex items-center gap-1.5 text-sm">
          <Sparkles className="w-4 h-4 text-orange-400" /> AI-Watchlist generieren
        </h4>
        <button
          onClick={() => setOpen((x) => !x)}
          className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
          {open ? 'Schliessen' : 'Öffnen'}
        </button>
      </div>
      {!open ? (
        <p className="text-neutral-500 text-xs">Themen-Investments mit Due Diligence per AI vorschlagen lassen.</p>
      ) : (
        <div>
          <TextField
            label="Thema / These"
            value={theme}
            onChange={setTheme}
            placeholder="z.B. Picks & Shovels AI-Welle 3, Defensive CH-Dividenden"
          />
          <div className="mb-3">
            <label className="block text-xs font-medium text-neutral-400 mb-1">Anzahl: {count}</label>
            <input
              type="range"
              min="3"
              max="8"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              className="w-full accent-orange-500"
            />
          </div>
          {err && (
            <div className="mb-2 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {err}
            </div>
          )}
          <PrimaryBtn onClick={generate} disabled={loading || !theme.trim() || !apiKey}>
            {loading ? <span className="flex items-center justify-center gap-2"><Spinner size={4} /> Generiere…</span> : 'Generieren'}
          </PrimaryBtn>
          {!apiKey && (
            <p className="text-[11px] text-orange-300 mt-2">Anthropic API-Key in Einstellungen nötig.</p>
          )}
        </div>
      )}
    </Card>
  );
}

function WatchlistDDModal({ item, apiKey, onClose, onUpdate }) {
  const [dd, setDd] = useState(() => ensureDD({ dueDiligence: item.dueDiligence, note: item.thesis }));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [diffState, setDiffState] = useState(null);
  const setField = (k, v) => setDd((d) => ({ ...d, [k]: v }));

  const runDeep = async () => {
    setLoading(true);
    setErr('');
    try {
      const pseudoPosition = {
        ticker: item.ticker,
        name: item.name,
        assetClass: 'Sonstige',
        currency: item.currency,
        costBasis: item.triggerPrice || 0,
        currentPrice: item.triggerPrice || 0,
        dueDiligence: dd,
      };
      const { current, proposed, summary, model } = await analyzePositionDeep(pseudoPosition, { apiKey });
      const liveCurrent = { ...current, userNotes: dd.userNotes, tags: dd.tags };
      const diff = computeDDDiff(liveCurrent, proposed);
      setDiffState({ current: liveCurrent, proposed, diff, summary, model });
    } catch (e) {
      setErr(e.message || 'Deep-Analyse fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const applyDiff = (acceptedKeys) => {
    if (!diffState) return;
    const { current, proposed, diff, summary, model } = diffState;
    const acceptedFlags = {
      thesis: acceptedKeys.includes('thesis'),
      fundamentals: acceptedKeys.includes('fundamentals'),
      strengths: acceptedKeys.includes('strengths'),
      risks: acceptedKeys.includes('risks'),
      catalysts: acceptedKeys.includes('catalysts'),
      recommendation: acceptedKeys.includes('recommendation'),
    };
    const merged = mergeDDDiff(current, proposed, acceptedFlags);
    merged.lastAnalyzedAt = Date.now();
    merged.lastAnalysisModel = model;
    const histSummary = summarizeDDDiff(diff, acceptedKeys);
    const withHistory = appendDDHistory(merged, {
      ts: Date.now(),
      source: 'deep',
      summary: `${histSummary}${summary ? ` — ${summary}` : ''}`.slice(0, 200),
      model,
    });
    setDd(withHistory);
    setDiffState(null);
  };

  const save = () => {
    onUpdate({ ...item, dueDiligence: dd, thesis: dd.thesis || item.thesis || '' });
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title={`DD: ${item.name}`}>
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3 gap-2">
          <p className="text-xs text-neutral-500">{item.ticker} · {item.currency}</p>
          <button
            onClick={runDeep}
            disabled={loading || !apiKey}
            title={!apiKey ? 'Anthropic API-Key in Einstellungen' : ''}
            className="flex items-center gap-1.5 bg-orange-500/15 hover:bg-orange-500/25 disabled:opacity-40 text-orange-400 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0"
          >
            {loading ? <Spinner size={3} /> : <Sparkles className="w-3.5 h-3.5" />}
            {loading ? 'Analysiere…' : 'DD aktualisieren'}
          </button>
        </div>
        {err && (
          <div className="mb-3 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {err}
          </div>
        )}
        <RecommendationBubble rec={dd.recommendation} model={dd.lastAnalysisModel} />
        <TextArea label="Thesis" value={dd.thesis} onChange={(v) => setField('thesis', v)} rows={2} placeholder="Warum interessant?" />
        <BulletEditor label="Stärken" items={dd.strengths} onChange={(v) => setField('strengths', v)} accent="green" />
        <BulletEditor label="Risiken" items={dd.risks} onChange={(v) => setField('risks', v)} accent="red" />
        <BulletEditor label="Catalysts" items={dd.catalysts} onChange={(v) => setField('catalysts', v)} accent="orange" />
        <TextArea label="Fundamentals" value={dd.fundamentals} onChange={(v) => setField('fundamentals', v)} placeholder="P/E, Margen, Verschuldung…" rows={3} />
        <TextArea label="Eigene Notizen" value={dd.userNotes} onChange={(v) => setField('userNotes', v)} rows={2} />
        <PrimaryBtn onClick={save}>DD speichern</PrimaryBtn>
      </Card>
      {diffState && (
        <DDDiffModal
          diff={diffState.diff}
          current={diffState.current}
          proposed={diffState.proposed}
          onClose={() => setDiffState(null)}
          onApply={applyDiff}
        />
      )}
    </Modal>
  );
}

function AddWatchlistModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({
    ticker: '', name: '', triggerPrice: '', currency: 'CHF', thesis: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.ticker || !form.name) return;
    onAdd({
      id: uid(),
      ticker: form.ticker.toUpperCase(),
      name: form.name,
      triggerPrice: form.triggerPrice ? parseFloat(form.triggerPrice) : null,
      currency: form.currency,
      thesis: form.thesis,
      source: 'self',
      addedAt: new Date().toISOString(),
    });
    onClose();
    setForm({ ticker: '', name: '', triggerPrice: '', currency: 'CHF', thesis: '' });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neu in Watchlist"
      footer={<PrimaryBtn onClick={submit}>Hinzufügen</PrimaryBtn>}
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Ticker" value={form.ticker} onChange={(v) => set('ticker', v)} />
        <TextField label="Name" value={form.name} onChange={(v) => set('name', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Trigger-Preis" type="number" step="0.01" value={form.triggerPrice} onChange={(v) => set('triggerPrice', v)} />
        <SelectField label="Währung" value={form.currency} onChange={(v) => set('currency', v)} options={CURRENCIES} />
      </div>
      <TextArea label="These" value={form.thesis} onChange={(v) => set('thesis', v)} placeholder="Warum interessant?" />
    </Modal>
  );
}

function ConvertToPositionModal({ item, onClose, onConfirm }) {
  const [form, setForm] = useState({
    shares: '',
    costBasis: item.triggerPrice != null ? String(item.triggerPrice) : '',
    currentPrice: item.triggerPrice != null ? String(item.triggerPrice) : '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    assetClass: ASSET_CLASSES[0],
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.shares || !form.costBasis) return;
    const inheritedDD = item.dueDiligence
      ? ensureDD({ dueDiligence: item.dueDiligence })
      : { ...emptyDD(), thesis: item.thesis || '' };
    onConfirm({
      id: uid(),
      ticker: item.ticker,
      name: item.name,
      assetClass: form.assetClass,
      shares: parseFloat(form.shares),
      costBasis: parseFloat(form.costBasis),
      currentPrice: parseFloat(form.currentPrice) || parseFloat(form.costBasis),
      currency: item.currency,
      purchaseDate: form.purchaseDate,
      note: item.thesis || inheritedDD.thesis || '',
      stopLoss: null,
      dueDiligence: inheritedDD,
    });
  };
  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`${item.name} kaufen`}
      footer={<PrimaryBtn onClick={submit}>Position anlegen</PrimaryBtn>}
    >
      <SelectField label="Asset-Klasse" value={form.assetClass} onChange={(v) => set('assetClass', v)} options={ASSET_CLASSES} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Anzahl" type="number" step="0.01" value={form.shares} onChange={(v) => set('shares', v)} />
        <TextField label={`Kaufkurs (${item.currency})`} type="number" step="0.01" value={form.costBasis} onChange={(v) => set('costBasis', v)} />
      </div>
      <TextField label="Kaufdatum" type="date" value={form.purchaseDate} onChange={(v) => set('purchaseDate', v)} />
    </Modal>
  );
}

/* =========================================================
   Coach (AI Chat) Tab
   ========================================================= */

function CoachTab({ portfolio, watchlist, fx, apiKey, chatHistory, setChatHistory, onAddWatchlistFromAI, onApplyDDUpdate, onApplyWatchlistDDUpdate, assessmentTrigger, onAssessmentDone }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  const buildSystem = () => {
    // Kompakte Portfolio-Liste – Position + 1-Zeilen-DD-Snapshot. Spart Tokens.
    const portfolioSummary = portfolio.map((p) => {
      const c = computePosition(p, fx);
      const dd = p.dueDiligence || {};
      return {
        t: p.ticker,
        n: p.name,
        cls: p.assetClass,
        ccy: p.currency,
        qty: p.shares,
        cost: p.costBasis,
        px: p.currentPrice,
        mvCHF: Math.round(c.mvCHF),
        pl: Number(c.plPct.toFixed(2)),
        sl: p.stopLoss,
        th: (dd.thesis || p.note || '').slice(0, 140),
        topRisks: (dd.risks || []).slice(0, 2),
        tags: dd.tags || [],
        ddDeep: !!dd.lastAnalyzedAt,
      };
    });
    const watchlistSummary = watchlist.map((w) => {
      const dd = w.dueDiligence || {};
      return {
        t: w.ticker,
        n: w.name,
        ccy: w.currency,
        trig: w.triggerPrice,
        px: w.currentPrice ?? null,
        src: w.source,
        th: (dd.thesis || w.thesis || '').slice(0, 140),
        topStrengths: (dd.strengths || []).slice(0, 2),
        topRisks: (dd.risks || []).slice(0, 2),
        catalysts: (dd.catalysts || []).slice(0, 2),
        ddDeep: !!dd.lastAnalyzedAt,
      };
    });
    const totalCHF = portfolio.reduce((s, p) => s + toCHF(p.shares * p.currentPrice, p.currency, fx), 0);
    return `Du bist ein erfahrener, ehrlicher Finanzberater für einen Schweizer Privatanleger. Du sprichst Deutsch (Du-Form). Du bist direkt, datenbasiert und nicht zu vorsichtig. Du erinnerst den User an Disziplin (Stop-Losses, Gewinnmitnahmen, Diversifikation). Du schmeichelst nicht. Du erwähnst Steuer-Aspekte der Schweiz wenn relevant (keine Kapitalgewinnsteuer privat).

TOOLS: Du hast Zugriff auf das web_search-Tool. Nutze es SPARSAM – nur wenn der User explizit nach aktuellen News, Earnings, Analyst-Calls oder tagesaktuellen Ereignissen fragt. Für reine Portfolio-Analyse (Klumpenrisiken, Diversifikation, Sektoren-Mix) brauchst du KEINE Web-Suche – dafür reichen die Portfolio-Daten unten. Token-Disziplin.

MARKER, die du am ENDE deiner Antwort verwenden darfst (jeweils auf eigene Zeile, ohne sonstige Erklärung im Marker selbst):

[WATCHLIST_VORSCHLAG: TICKER | NAME | THESE]
  → konkrete Aktie für Watchlist empfehlen.

[POSITION_DD: TICKER | <field> | <op> <value>]
  → DD-Update zu einer bestehenden Position vorschlagen (User bestätigt).
  <field> ∈ {thesis, fundamentals, strengths, risks, catalysts}
  <op> ∈ { + (an Liste anhängen), - (aus Liste entfernen), = (Text ersetzen) }
  Beispiele:
    [POSITION_DD: NOVN | risks | + Patent-Cliff Entresto 2026 ]
    [POSITION_DD: AAPL | catalysts | + Q1-Earnings 30.01.2026 ]
    [POSITION_DD: ROG | thesis | = Defensiver Pharma-Anker mit Diagnostics-Hebel ]
  Nutze POSITION_DD nur, wenn du wirklich neue oder präzisere Erkenntnisse hast.
  ÜBERSCHREIBE NIE 'userNotes' oder 'tags' einer Position – das gehört dem User.

[WATCHLIST_DD: TICKER | <field> | <op> <value>]
  → Wie POSITION_DD, aber für Watchlist-Items. Gleiche Felder, gleiche Ops.

[NEED_DD: TICKER]
  → Du brauchst tiefere Daten zu dieser Position, der User soll eine Deep-Analyse anstoßen.

KONTEXT:
Total Portfolio CHF: ${Math.round(totalCHF)}
FX (in CHF): ${JSON.stringify(fx)}

Portfolio (Compact-JSON, eine Zeile pro Position):
${portfolioSummary.map((x) => JSON.stringify(x)).join('\n')}

Watchlist (Compact-JSON, eine Zeile pro Item):
${watchlistSummary.map((x) => JSON.stringify(x)).join('\n') || '(leer)'}`;
  };

  const send = async (overrideText) => {
    const text = overrideText ?? input.trim();
    if (!text || loading) return;
    setErr('');
    const userMsg = { role: 'user', content: text, ts: Date.now() };
    const next = [...chatHistory, userMsg];
    setChatHistory(next);
    setInput('');
    setLoading(true);
    try {
      const apiMessages = next.map((m) => ({ role: m.role, content: m.content }));
      const reply = await callClaude({
        system: buildSystem(),
        messages: apiMessages,
        apiKey,
        model: MODEL_COACH,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      });
      setChatHistory([...next, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch (e) {
      setErr(e.message || 'Fehler beim AI-Call');
      setChatHistory([...next, {
        role: 'assistant',
        content: `_Fehler: ${e.message || 'AI nicht erreichbar'}_`,
        ts: Date.now(),
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger für Assessment vom Dashboard
  useEffect(() => {
    if (assessmentTrigger) {
      const prompt = 'Mache ein vollständiges Assessment dieses Portfolios. Strukturiert mit: 1) Stärken, 2) Risiken/Klumpen, 3) Konkrete Handlungsempfehlungen (3-5 Punkte), 4) Eine Aktie zum eventuellen Verkauf, 5) Eine Aktie für die Watchlist als Ergänzung. Wenn dir konkrete Risiken, Catalysts oder Thesis-Updates zu einzelnen Positionen auffallen, emittiere am Ende [POSITION_DD: …]-Marker für jede Erkenntnis (max. 6).';
      send(prompt);
      onAssessmentDone();
    }
    // eslint-disable-next-line
  }, [assessmentTrigger]);

  const parseSuggestions = (text) => {
    const re = /\[WATCHLIST_VORSCHLAG:\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^\]]+?)\s*\]/g;
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      out.push({ ticker: m[1].trim().toUpperCase(), name: m[2].trim(), thesis: m[3].trim() });
    }
    return out;
  };

  // [POSITION_DD: TICKER | field | <op> <value>] und [WATCHLIST_DD: …] identisch strukturiert.
  const parseDDUpdates = (text, marker) => {
    const re = new RegExp(`\\[${marker}:\\s*([^|]+?)\\s*\\|\\s*([a-zA-Z]+)\\s*\\|\\s*([+\\-=])\\s*([^\\]]+?)\\s*\\]`, 'g');
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      const field = m[2].trim();
      if (!['thesis', 'fundamentals', 'strengths', 'risks', 'catalysts'].includes(field)) continue;
      out.push({
        ticker: m[1].trim().toUpperCase(),
        field,
        op: m[3].trim(),
        value: m[4].trim(),
      });
    }
    return out;
  };
  const parsePositionDDUpdates = (text) => parseDDUpdates(text, 'POSITION_DD');
  const parseWatchlistDDUpdates = (text) => parseDDUpdates(text, 'WATCHLIST_DD');

  const parseNeedDD = (text) => {
    const re = /\[NEED_DD:\s*([^\]]+?)\s*\]/g;
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) out.push(m[1].trim().toUpperCase());
    return out;
  };

  const stripMarkers = (text) =>
    text
      .replace(/\[WATCHLIST_VORSCHLAG:[^\]]*\]/g, '')
      .replace(/\[POSITION_DD:[^\]]*\]/g, '')
      .replace(/\[WATCHLIST_DD:[^\]]*\]/g, '')
      .replace(/\[NEED_DD:[^\]]*\]/g, '')
      .trim();

  const newChat = () => {
    if (confirm('Chatverlauf löschen?')) setChatHistory([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <h2 className="text-white font-semibold">Finanz-Coach</h2>
        </div>
        <button onClick={newChat} className="flex items-center gap-1 text-neutral-400 text-sm">
          <RotateCcw className="w-4 h-4" /> Neuer Chat
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
        {chatHistory.length === 0 && (
          <Card className="p-4 mt-3">
            <p className="text-neutral-300 text-sm">
              Ich kenne dein Portfolio und deine Watchlist inklusive aller DDs. Ich kann DD-Updates vorschlagen (du bestätigst pro Feld).
            </p>
            <div className="mt-3 space-y-2">
              {[
                'Wo habe ich gerade ein Klumpenrisiko?',
                'Welche Positionen haben einen Verkaufs-Verdict?',
                'Welche DDs sind älter als 90 Tage und brauchen ein Refresh?',
                'Schlage Risiken-Updates für meine roten Positionen vor.',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-2 rounded-lg"
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
        )}

        {chatHistory.map((m, idx) => {
          const isUser = m.role === 'user';
          const suggestions = !isUser ? parseSuggestions(m.content) : [];
          const ddUpdates = !isUser ? parsePositionDDUpdates(m.content) : [];
          const wddUpdates = !isUser ? parseWatchlistDDUpdates(m.content) : [];
          const needDD = !isUser ? parseNeedDD(m.content) : [];
          const cleaned = !isUser ? stripMarkers(m.content) : m.content;
          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap text-sm ${
                  isUser
                    ? 'bg-orange-500 text-black'
                    : m.error
                    ? 'bg-red-950/50 border border-red-500/40 text-red-200'
                    : 'bg-neutral-800 text-neutral-100'
                }`}
              >
                {cleaned}
                {suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {suggestions.map((s, i) => (
                      <SuggestionCard
                        key={i}
                        suggestion={s}
                        onAccept={() => onAddWatchlistFromAI(s)}
                      />
                    ))}
                  </div>
                )}
                {ddUpdates.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {ddUpdates.map((u, i) => {
                      const known = portfolio.some((p) => p.ticker === u.ticker);
                      return (
                        <DDUpdateCard
                          key={i}
                          update={u}
                          knownTicker={known}
                          scope="position"
                          onAccept={() => onApplyDDUpdate?.(u)}
                        />
                      );
                    })}
                  </div>
                )}
                {wddUpdates.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {wddUpdates.map((u, i) => {
                      const known = watchlist.some((w) => w.ticker === u.ticker);
                      return (
                        <DDUpdateCard
                          key={i}
                          update={u}
                          knownTicker={known}
                          scope="watchlist"
                          onAccept={() => onApplyWatchlistDDUpdate?.(u)}
                        />
                      );
                    })}
                  </div>
                )}
                {needDD.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {needDD.map((tk, i) => (
                      <div
                        key={i}
                        className="text-[11px] text-orange-300 bg-orange-500/10 border border-orange-500/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Coach möchte tiefere Daten zu <b>{tk}</b>. Öffne die Position und klicke „Tief analysieren".
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Spinner size={4} />
              <span className="text-neutral-400 text-sm">Coach denkt nach…</span>
            </div>
          </div>
        )}

        {err && (
          <div className="bg-red-950/50 border border-red-500/40 rounded-xl p-3 text-red-300 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-neutral-800 bg-black shrink-0 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Frag deinen Coach…"
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 resize-none max-h-32"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="bg-orange-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-black p-3 rounded-2xl"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DDUpdateCard({ update, knownTicker, onAccept, scope = 'position' }) {
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const opLabel = update.op === '+' ? 'Hinzufügen' : update.op === '-' ? 'Entfernen' : 'Ersetzen';
  const fieldLabel = {
    thesis: 'Thesis',
    fundamentals: 'Fundamentals',
    strengths: 'Stärke',
    risks: 'Risiko',
    catalysts: 'Catalyst',
  }[update.field] || update.field;
  const scopeLabel = scope === 'watchlist' ? 'Watchlist' : 'Position';
  const borderClass = scope === 'watchlist' ? 'border-orange-500/40' : 'border-blue-500/40';
  const headColor = scope === 'watchlist' ? 'text-orange-300' : 'text-blue-400';
  const btnClass = scope === 'watchlist'
    ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300'
    : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300';

  if (skipped) return null;

  return (
    <div className={`bg-neutral-900 border ${borderClass} rounded-xl p-3`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className={`text-[10px] ${headColor} font-semibold uppercase tracking-wide`}>
          {scopeLabel}-DD · {update.ticker}
        </p>
        <Pill color={scope === 'watchlist' ? 'accent' : 'blue'}>{opLabel} {fieldLabel}</Pill>
      </div>
      <p className="text-neutral-200 text-sm">{update.value}</p>
      {!knownTicker && (
        <p className="text-[11px] text-orange-300 mt-1">⚠ Ticker nicht im Portfolio</p>
      )}
      {done ? (
        <div className="mt-2 flex items-center gap-1 text-green-400 text-xs">
          <Check className="w-4 h-4" /> Übernommen
        </div>
      ) : (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => { if (!knownTicker) return; onAccept(); setDone(true); }}
            disabled={!knownTicker}
            className={`flex-1 disabled:opacity-40 font-medium py-1.5 rounded-lg text-xs ${btnClass}`}
          >
            Übernehmen
          </button>
          <button
            onClick={() => setSkipped(true)}
            className="px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-medium py-1.5 rounded-lg text-xs"
          >
            Verwerfen
          </button>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion, onAccept }) {
  const [added, setAdded] = useState(false);
  return (
    <div className="bg-neutral-900 border border-orange-500/40 rounded-xl p-3">
      <p className="text-xs text-orange-400 font-semibold uppercase tracking-wide">Watchlist-Vorschlag</p>
      <p className="text-white font-semibold mt-1">{suggestion.name} <span className="text-neutral-400 font-normal">({suggestion.ticker})</span></p>
      <p className="text-neutral-300 text-xs mt-1">{suggestion.thesis}</p>
      {added ? (
        <div className="mt-2 flex items-center gap-1 text-green-400 text-xs">
          <Check className="w-4 h-4" /> Hinzugefügt
        </div>
      ) : (
        <button
          onClick={() => { onAccept(); setAdded(true); }}
          className="mt-2 w-full bg-orange-500 text-black font-semibold py-2 rounded-lg text-sm"
        >
          Auf Watchlist setzen
        </button>
      )}
    </div>
  );
}

/* =========================================================
   Apps-Script-Quelltext (in Sheet → Apps Script einfügen)
   ========================================================= */

const APPS_SCRIPT_SOURCE = `// AI-Berater – Google-Sheets-Sync
// Bereitstellen: Web-App, ausführen als ICH, Zugriff JEDER (mit Link)
const TABS = { portfolio: 'Portfolio', trades: 'Trades', watchlist: 'Watchlist' };
const SCHEMA = {
  portfolio: ['id','ticker','name','assetClass','shares','costBasis','currentPrice','currency','purchaseDate','note','stopLoss','lastQuoteAt','quoteSource','dueDiligence'],
  trades: ['id','date','side','ticker','name','shares','price','currency','fee','note'],
  watchlist: ['id','ticker','name','triggerPrice','currency','thesis','source','addedAt','dueDiligence'],
};

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    if (req.action === 'push') return jsonResp({ ok: true, ...pushAll(req) });
    if (req.action === 'pull') return jsonResp({ ok: true, data: pullAll() });
    return jsonResp({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResp({ ok: false, error: String(err) });
  }
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function pushAll(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ['portfolio','trades','watchlist'].forEach((k) => {
    const tabName = TABS[k];
    const rows = Array.isArray(req[k]) ? req[k] : [];
    let sh = ss.getSheetByName(tabName);
    if (!sh) sh = ss.insertSheet(tabName);
    sh.clear();
    const cols = SCHEMA[k];
    const data = [cols].concat(rows.map((r) => cols.map((c) => {
      const v = r[c];
      if (c === 'dueDiligence') return v ? JSON.stringify(v) : '';
      if (v == null) return '';
      return v;
    })));
    sh.getRange(1, 1, data.length, cols.length).setValues(data);
  });
  return { counts: {
    portfolio: (req.portfolio || []).length,
    trades: (req.trades || []).length,
    watchlist: (req.watchlist || []).length,
  }};
}

function pullAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = { portfolio: [], trades: [], watchlist: [] };
  ['portfolio','trades','watchlist'].forEach((k) => {
    const sh = ss.getSheetByName(TABS[k]);
    if (!sh) return;
    const vals = sh.getDataRange().getValues();
    if (vals.length < 2) return;
    const header = vals[0].map(String);
    for (let i = 1; i < vals.length; i++) {
      const row = vals[i];
      if (!row[0]) continue;
      const obj = {};
      header.forEach((h, idx) => {
        let v = row[idx];
        if (h === 'dueDiligence' && typeof v === 'string' && v.length > 0) {
          try { v = JSON.parse(v); } catch (e) { v = null; }
        }
        if (['shares','costBasis','currentPrice','stopLoss','price','fee','triggerPrice'].indexOf(h) >= 0 && v !== '' && v != null) {
          v = Number(v);
        }
        obj[h] = v === '' ? null : v;
      });
      out[k].push(obj);
    }
  });
  return out;
}
`;

/* =========================================================
   Settings Modal
   ========================================================= */

function SettingsModal({ open, onClose, settings, setSettings, onReset, portfolio, watchlist, onImport }) {
  const [fx, setFx] = useState(settings.fx);
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [finnhubKey, setFinnhubKey] = useState(settings.finnhubKey || '');
  const [gasUrl, setGasUrl] = useState(settings.gasUrl || '');
  const [importErr, setImportErr] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncErr, setSyncErr] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const fileInputRef = useRef(null);
  useEffect(() => {
    setFx(settings.fx);
    setApiKey(settings.apiKey || '');
    setFinnhubKey(settings.finnhubKey || '');
    setGasUrl(settings.gasUrl || '');
    setImportErr('');
    setSyncErr('');
    setSyncStatus('');
  }, [settings.fx, settings.apiKey, settings.finnhubKey, settings.gasUrl, open]);

  const doSyncPush = async () => {
    setSyncBusy(true); setSyncErr(''); setSyncStatus('');
    try {
      const url = gasUrl.trim();
      // trades:[] für Backwards-Compat mit Apps-Script (Trades-Tab im Sheet bleibt leer)
      await gasPush(url, { portfolio, trades: [], watchlist });
      setSyncStatus(`Push OK – ${new Date().toLocaleString('de-CH')}`);
      setSettings({ ...settings, gasUrl: url, lastSheetSyncAt: Date.now(), lastSheetSyncKind: 'push' });
    } catch (e) {
      setSyncErr(e.message || 'Push fehlgeschlagen.');
    } finally {
      setSyncBusy(false);
    }
  };
  const doSyncPull = async () => {
    if (!confirm('Pull überschreibt deine lokalen Daten (Portfolio, Trades, Watchlist). Fortfahren?')) return;
    setSyncBusy(true); setSyncErr(''); setSyncStatus('');
    try {
      const url = gasUrl.trim();
      const data = await gasPull(url);
      onImport(data);
      setSyncStatus(`Pull OK – ${new Date().toLocaleString('de-CH')}`);
      setSettings({ ...settings, gasUrl: url, lastSheetSyncAt: Date.now(), lastSheetSyncKind: 'pull' });
    } catch (e) {
      setSyncErr(e.message || 'Pull fehlgeschlagen.');
    } finally {
      setSyncBusy(false);
    }
  };

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_SOURCE);
      setSyncStatus('Code kopiert.');
      setTimeout(() => setSyncStatus(''), 2000);
    } catch {
      setSyncErr('Clipboard nicht verfügbar.');
    }
  };

  const exportData = () => {
    const payload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      portfolio,
      watchlist,
      settings: { fx: settings.fx }, // KEINE API-Keys exportieren
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-berater-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e) => {
    setImportErr('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const data = JSON.parse(txt);
      if (!data || !Array.isArray(data.portfolio)) throw new Error('Ungültiges Backup-Format (portfolio fehlt).');
      if (!confirm(`Backup vom ${data.exportedAt?.slice(0,10) || '?'} importieren? Überschreibt Portfolio (${data.portfolio.length}) und Watchlist (${data.watchlist?.length || 0}).`)) {
        e.target.value = '';
        return;
      }
      onImport(data);
      onClose();
    } catch (err) {
      setImportErr(err.message || 'Import fehlgeschlagen.');
    } finally {
      e.target.value = '';
    }
  };

  const save = () => {
    setSettings({
      ...settings,
      apiKey: apiKey.trim(),
      finnhubKey: finnhubKey.trim(),
      gasUrl: gasUrl.trim(),
      fx: {
        CHF: 1,
        USD: parseFloat(fx.USD) || DEFAULT_FX.USD,
        EUR: parseFloat(fx.EUR) || DEFAULT_FX.EUR,
        SEK: parseFloat(fx.SEK) || DEFAULT_FX.SEK,
      },
    });
    onClose();
  };

  const lastSync = settings.lastSheetSyncAt;
  const lastSyncAgo = lastSync ? Math.max(0, Math.round((Date.now() - lastSync) / 60000)) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Einstellungen"
      footer={<PrimaryBtn onClick={save}>Speichern</PrimaryBtn>}
    >
      <Card className="p-4 mb-3">
        <h4 className="text-white font-semibold mb-2">Anthropic API-Key</h4>
        <p className="text-neutral-400 text-xs mb-2">
          Wird lokal gespeichert und direkt an api.anthropic.com gesendet. Hol dir einen Key auf console.anthropic.com.
        </p>
        <TextField label="sk-ant-…" type="password" value={apiKey} onChange={setApiKey} placeholder="sk-ant-api03-…" />
      </Card>
      <Card className="p-4 mb-3">
        <h4 className="text-white font-semibold mb-2">Finnhub API-Key (Live-Kurse)</h4>
        <p className="text-neutral-400 text-xs mb-2">
          Optional, aber empfohlen. Free-Plan auf finnhub.io (60 Calls/Min, hauptsächlich US-Aktien).
          Schweizer/EU-Aktien werden automatisch über Yahoo (corsproxy.io) geholt.
        </p>
        <TextField label="Finnhub Token" type="password" value={finnhubKey} onChange={setFinnhubKey} placeholder="cv…" />
      </Card>
      <Card className="p-4 mb-3">
        <h4 className="text-white font-semibold mb-2">FX-Raten (zu CHF)</h4>
        <TextField label="1 USD =" type="number" step="0.0001" value={fx.USD} onChange={(v) => setFx({ ...fx, USD: v })} />
        <TextField label="1 EUR =" type="number" step="0.0001" value={fx.EUR} onChange={(v) => setFx({ ...fx, EUR: v })} />
        <TextField label="1 SEK =" type="number" step="0.0001" value={fx.SEK} onChange={(v) => setFx({ ...fx, SEK: v })} />
      </Card>
      <Card className="p-4 mb-3">
        <h4 className="text-white font-semibold mb-2 flex items-center gap-1.5">
          <Cloud className="w-4 h-4 text-orange-400" /> Google-Sheets-Sync
        </h4>
        <p className="text-neutral-400 text-xs mb-2">
          Multi-Device & eigene Analysen in Sheets. Push überschreibt das Sheet, Pull überschreibt lokal („Last writer wins").
        </p>
        <TextField label="Apps-Script Web-App URL" type="password" value={gasUrl} onChange={setGasUrl} placeholder="https://script.google.com/macros/s/.../exec" />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <GhostBtn onClick={doSyncPush} className={syncBusy || !gasUrl ? 'opacity-50 pointer-events-none' : ''}>
            <span className="flex items-center justify-center gap-1.5"><CloudUpload className="w-4 h-4" /> Push</span>
          </GhostBtn>
          <GhostBtn onClick={doSyncPull} className={syncBusy || !gasUrl ? 'opacity-50 pointer-events-none' : ''}>
            <span className="flex items-center justify-center gap-1.5"><CloudDownload className="w-4 h-4" /> Pull</span>
          </GhostBtn>
        </div>
        {syncBusy && <p className="text-orange-400 text-xs flex items-center gap-1.5"><Spinner size={3} /> Synchronisiere…</p>}
        {syncStatus && !syncBusy && <p className="text-green-400 text-xs">{syncStatus}</p>}
        {syncErr && (
          <div className="mt-2 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {syncErr}
          </div>
        )}
        {lastSync && !syncStatus && (
          <p className="text-neutral-500 text-[11px] mt-1">
            Letzter {settings.lastSheetSyncKind === 'pull' ? 'Pull' : 'Push'} {lastSyncAgo === 0 ? 'gerade' : `vor ${lastSyncAgo} Min`}
          </p>
        )}
        <button
          onClick={() => setSetupOpen((x) => !x)}
          className="mt-3 flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${setupOpen ? 'rotate-90' : ''}`} />
          Setup-Anleitung
        </button>
        {setupOpen && (
          <div className="mt-2 text-xs text-neutral-400 space-y-2">
            <ol className="list-decimal pl-4 space-y-1">
              <li>Neues Google-Sheet anlegen → Erweiterungen → Apps Script.</li>
              <li>Code unten kopieren, in <code>Code.gs</code> einfügen, speichern.</li>
              <li>Bereitstellen → Neue Bereitstellung → Web-App → „Jeder" → URL hier oben einfügen.</li>
              <li>Push klicken → drei Tabs erscheinen im Sheet.</li>
            </ol>
            <button
              onClick={copyScript}
              className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs"
            >
              <Copy className="w-3.5 h-3.5" /> Apps-Script-Code kopieren
            </button>
          </div>
        )}
      </Card>
      <Card className="p-4 mb-3">
        <h4 className="text-white font-semibold mb-1">Backup (Export / Import)</h4>
        <p className="text-neutral-400 text-xs mb-3">
          Deine Daten leben nur in diesem Browser. Mach regelmässig Backups – inkl. Due-Diligence-Notizen.
          API-Keys werden aus Sicherheitsgründen NICHT exportiert.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <GhostBtn onClick={exportData}>Exportieren</GhostBtn>
          <GhostBtn onClick={() => fileInputRef.current?.click()}>Importieren</GhostBtn>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
        {importErr && (
          <div className="mt-2 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {importErr}
          </div>
        )}
      </Card>
      <Card className="p-4">
        <h4 className="text-white font-semibold mb-2">Daten zurücksetzen</h4>
        <p className="text-neutral-400 text-xs mb-3">
          Setzt Portfolio, Trades, Watchlist und Chatverlauf auf die Demo-Daten zurück.
        </p>
        <GhostBtn onClick={() => { if (confirm('Wirklich alle Daten zurücksetzen?')) { onReset(); onClose(); } }}>
          Zurücksetzen
        </GhostBtn>
      </Card>
    </Modal>
  );
}

/* =========================================================
   Onboarding
   ========================================================= */

function Onboarding({ onClose }) {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Willkommen bei Mein Finanz-Coach"
      footer={<PrimaryBtn onClick={onClose}>Los geht's</PrimaryBtn>}
    >
      <div className="space-y-3 text-neutral-300 text-sm">
        <p>Analyse-Tool für dein Portfolio. Kern: lebende Due Diligence pro Position.</p>
        <ul className="space-y-2">
          <li className="flex gap-2"><Home className="w-4 h-4 mt-0.5 text-orange-400" /> <span><b>Home</b>: Total CHF + AI-Verdicts (was halten / reduzieren / verkaufen / nachkaufen).</span></li>
          <li className="flex gap-2"><Briefcase className="w-4 h-4 mt-0.5 text-orange-400" /> <span><b>Portfolio</b>: Positionen mit Verdict-Pill und DD-Alter. Per Klick: DD aktualisieren mit Diff-Preview.</span></li>
          <li className="flex gap-2"><Eye className="w-4 h-4 mt-0.5 text-orange-400" /> <span><b>Watchlist</b>: Was research ich? AI-Generator nach Thema, eigene DD vor Kauf.</span></li>
          <li className="flex gap-2"><MessageCircle className="w-4 h-4 mt-0.5 text-orange-400" /> <span><b>Coach</b>: kennt Portfolio + Watchlist + DDs. Kann DD-Updates vorschlagen (du bestätigst pro Feld).</span></li>
        </ul>
        <p className="text-neutral-500 text-xs">
          Alle Daten liegen lokal auf dem Gerät. Initial werden Demo-Daten geladen, die du frei anpassen kannst.
        </p>
      </div>
    </Modal>
  );
}

/* =========================================================
   Bottom Navigation
   ========================================================= */

function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
    { id: 'watchlist', icon: Eye, label: 'Watchlist' },
    { id: 'coach', icon: MessageCircle, label: 'Coach' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur border-t border-neutral-800 pb-[max(env(safe-area-inset-bottom),0.25rem)] z-40">
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 transition ${
                active ? 'text-orange-400' : 'text-neutral-500'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* =========================================================
   Top Bar
   ========================================================= */

function TopBar({ title, onSettings, onRefresh, refreshing, lastRefresh }) {
  const ago = lastRefresh ? Math.max(0, Math.round((Date.now() - lastRefresh) / 60000)) : null;
  return (
    <header className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-neutral-900 pt-[max(env(safe-area-inset-top),0.5rem)]">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <div className="min-w-0">
          <h1 className="text-white font-bold text-lg">{title}</h1>
          {lastRefresh && (
            <p className="text-[10px] text-neutral-500 leading-tight">
              Kurse {ago === 0 ? 'gerade' : `vor ${ago} Min`} aktualisiert
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <IconBtn onClick={() => onRefresh(true)}>
              {refreshing
                ? <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                : <RotateCcw className="w-5 h-5 text-neutral-400" />}
            </IconBtn>
          )}
          <IconBtn onClick={onSettings}>
            <SettingsIcon className="w-5 h-5 text-neutral-400" />
          </IconBtn>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   Main App
   ========================================================= */

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [portfolio, setPortfolio] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [settings, setSettingsState] = useState({ fx: DEFAULT_FX });
  const [openPositionId, setOpenPositionId] = useState(null);
  const [portfolioInitialSort, setPortfolioInitialSort] = useState('mv');
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [assessmentTrigger, setAssessmentTrigger] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Initial Load
  useEffect(() => {
    (async () => {
      const [p, w, c, s, onb] = await Promise.all([
        storage.get('portfolio'),
        storage.get('watchlist'),
        storage.get('chatHistory'),
        storage.get('settings'),
        storage.get('onboardingSeen'),
      ]);
      setPortfolio(migrateDD(p ?? DEMO_PORTFOLIO));
      setWatchlist(w ?? DEMO_WATCHLIST);
      setChatHistory(c ?? []);
      setSettingsState(s ?? { fx: DEFAULT_FX });
      if (!onb) setShowOnboarding(true);
      setHydrated(true);
    })();
  }, []);

  // Persist
  useEffect(() => { if (hydrated) storage.set('portfolio', portfolio); }, [portfolio, hydrated]);
  useEffect(() => { if (hydrated) storage.set('watchlist', watchlist); }, [watchlist, hydrated]);
  useEffect(() => { if (hydrated) storage.set('chatHistory', chatHistory); }, [chatHistory, hydrated]);
  useEffect(() => { if (hydrated) storage.set('settings', settings); }, [settings, hydrated]);

  const fx = settings.fx || DEFAULT_FX;

  // Position handlers
  const updatePosition = (pos) =>
    setPortfolio((arr) => arr.map((x) => (x.id === pos.id ? pos : x)));
  const updatePositionWithCascade = (pos /* oldTicker */) => {
    // Trade-Log existiert nicht mehr – kein Cascade nötig. Signatur bleibt für Compat.
    setPortfolio((arr) => arr.map((x) => (x.id === pos.id ? pos : x)));
  };
  const deletePosition = (id) =>
    setPortfolio((arr) => arr.filter((x) => x.id !== id));
  const addPosition = (pos) => setPortfolio((arr) => [pos, ...arr]);
  const addPositions = (positions) => setPortfolio((arr) => [...positions, ...arr]);

  // DD-Updates aus dem Coach-Assessment auf eine Position anwenden.
  // update: { ticker, field, op: '+'|'-'|'=', value }
  // Gibt true zurück, wenn die Position gefunden und gemerged wurde.
  const applyDDUpdate = (update) => {
    let applied = false;
    setPortfolio((arr) => arr.map((p) => {
      if (p.ticker !== update.ticker) return p;
      if (update.field === 'userNotes' || update.field === 'tags' || update.field === 'recommendation') return p; // AI darf das nicht / recommendation läuft nur über Diff-Modal
      const dd = ensureDD(p);
      let nextField;
      if (DD_LIST_FIELDS.includes(update.field)) {
        const list = dd[update.field] || [];
        if (update.op === '+') nextField = [...list, update.value];
        else if (update.op === '-') nextField = list.filter((x) => x !== update.value);
        else nextField = [update.value];
      } else if (DD_TEXT_FIELDS.includes(update.field) || update.field === 'thesis' || update.field === 'fundamentals') {
        nextField = update.value;
      } else {
        return p;
      }
      const newDD = appendDDHistory(
        { ...dd, [update.field]: nextField, lastAnalyzedAt: Date.now() },
        { ts: Date.now(), source: 'assessment', summary: `${update.op === '+' ? '+' : update.op === '-' ? '–' : '='} ${update.field}: ${String(update.value).slice(0, 80)}`, model: MODEL_COACH },
      );
      applied = true;
      return { ...p, dueDiligence: newDD, note: update.field === 'thesis' ? update.value : p.note };
    }));
    return applied;
  };

  // Watchlist-DD-Update analog applyDDUpdate, aber gegen `watchlist[]`.
  const applyWatchlistDDUpdate = (update) => {
    let applied = false;
    setWatchlist((arr) => arr.map((w) => {
      if (w.ticker !== update.ticker) return w;
      if (update.field === 'userNotes' || update.field === 'tags' || update.field === 'recommendation') return w;
      const dd = ensureDD(w);
      let nextField;
      if (DD_LIST_FIELDS.includes(update.field)) {
        const list = dd[update.field] || [];
        if (update.op === '+') nextField = [...list, update.value];
        else if (update.op === '-') nextField = list.filter((x) => x !== update.value);
        else nextField = [update.value];
      } else if (DD_TEXT_FIELDS.includes(update.field) || update.field === 'thesis' || update.field === 'fundamentals') {
        nextField = update.value;
      } else {
        return w;
      }
      const newDD = appendDDHistory(
        { ...dd, [update.field]: nextField, lastAnalyzedAt: Date.now() },
        { ts: Date.now(), source: 'assessment', summary: `${update.op === '+' ? '+' : update.op === '-' ? '–' : '='} ${update.field}: ${String(update.value).slice(0, 80)}`, model: MODEL_COACH },
      );
      applied = true;
      return { ...w, dueDiligence: newDD, thesis: update.field === 'thesis' ? update.value : w.thesis };
    }));
    return applied;
  };

  // Live-Kurs Refresh
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refreshAllQuotes = async (force = false) => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const refreshOne = async (item) => {
        const lookupTicker = item.resolvedTicker || item.ticker;
        const cacheKey = `${normalizeTicker(lookupTicker)}|${item.currency || ''}`;
        if (force) {
          quoteCache.delete(normalizeTicker(lookupTicker));
          quoteCache.delete(cacheKey);
        }
        const m = await getMarketData(lookupTicker, settings.finnhubKey, {
          preferredCurrency: item.currency,
        }).catch(() => null);
        if (!m || m.price == null) return item;
        return {
          ...item,
          currentPrice: m.price,
          resolvedTicker: item.resolvedTicker || m.resolvedSymbol || null,
          lastQuoteAt: Date.now(),
          quoteSource: m.source,
        };
      };
      const [updatedPortfolio, updatedWatchlist] = await Promise.all([
        Promise.all(portfolio.map(refreshOne)),
        Promise.all(watchlist.map(refreshOne)),
      ]);
      setPortfolio(updatedPortfolio);
      setWatchlist(updatedWatchlist);
      setLastRefresh(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-Refresh alle 5 Min wenn Tab sichtbar
  useEffect(() => {
    if (!hydrated) return;
    refreshAllQuotes(); // initial
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshAllQuotes();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [hydrated, settings.finnhubKey]);

  // Watchlist handlers
  const addWatchlist = (w) => setWatchlist((arr) => [w, ...arr]);
  const addWatchlistMany = (items) => setWatchlist((arr) => [...items, ...arr]);
  const updateWatchlist = (w) =>
    setWatchlist((arr) => arr.map((x) => (x.id === w.id ? w : x)));
  const removeWatchlist = (id) => setWatchlist((arr) => arr.filter((x) => x.id !== id));
  const addWatchlistFromAI = (s) => {
    if (watchlist.some((w) => w.ticker === s.ticker)) return;
    addWatchlist({
      id: uid(),
      ticker: s.ticker,
      name: s.name,
      thesis: s.thesis,
      triggerPrice: null,
      currency: 'CHF',
      source: 'ai',
      addedAt: new Date().toISOString(),
    });
  };
  const convertWatchlist = (id, position) => {
    addPosition(position);
    removeWatchlist(id);
    setTab('portfolio');
  };

  const reset = () => {
    setPortfolio(migrateDD(DEMO_PORTFOLIO));
    setWatchlist(DEMO_WATCHLIST);
    setChatHistory([]);
    setSettingsState({ fx: DEFAULT_FX });
  };

  const finishOnboarding = () => {
    setShowOnboarding(false);
    storage.set('onboardingSeen', true);
  };

  const triggerAssessment = () => {
    setTab('coach');
    setAssessmentTrigger((n) => n + 1);
  };

  const openPos = openPositionId ? portfolio.find((p) => p.id === openPositionId) : null;

  const titleMap = {
    dashboard: 'Mein Finanz-Coach',
    portfolio: 'Portfolio',
    watchlist: 'Watchlist',
    coach: 'Coach',
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner size={6} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased">
      <div className="max-w-md mx-auto relative">
        <TopBar
          title={titleMap[tab]}
          onSettings={() => setShowSettings(true)}
          onRefresh={refreshAllQuotes}
          refreshing={refreshing}
          lastRefresh={lastRefresh}
        />

        {tab === 'dashboard' && (
          <Dashboard
            portfolio={portfolio}
            fx={fx}
            onAssess={triggerAssessment}
            onOpenPortfolioByVerdict={() => { setPortfolioInitialSort('verdict'); setTab('portfolio'); }}
          />
        )}
        {tab === 'portfolio' && (
          <PortfolioList
            portfolio={portfolio}
            fx={fx}
            initialSort={portfolioInitialSort}
            onOpenPosition={(id) => setOpenPositionId(id)}
            onAddPosition={() => setShowAddPosition(true)}
          />
        )}
        {tab === 'watchlist' && (
          <WatchlistTab
            watchlist={watchlist}
            portfolio={portfolio}
            apiKey={settings.apiKey}
            onAdd={addWatchlist}
            onAddMany={addWatchlistMany}
            onRemove={removeWatchlist}
            onUpdate={updateWatchlist}
            onConvert={convertWatchlist}
          />
        )}
        {tab === 'coach' && (
          <CoachTab
            portfolio={portfolio}
            watchlist={watchlist}
            fx={fx}
            apiKey={settings.apiKey}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            onAddWatchlistFromAI={addWatchlistFromAI}
            onApplyDDUpdate={applyDDUpdate}
            onApplyWatchlistDDUpdate={applyWatchlistDDUpdate}
            assessmentTrigger={assessmentTrigger}
            onAssessmentDone={() => {}}
          />
        )}

        <BottomNav tab={tab} setTab={setTab} />

        {openPos && (
          <PositionDetail
            position={openPos}
            fx={fx}
            apiKey={settings.apiKey}
            onClose={() => setOpenPositionId(null)}
            onUpdate={updatePosition}
            onUpdateWithCascade={updatePositionWithCascade}
            onDelete={deletePosition}
          />
        )}

        <AddPositionModal
          open={showAddPosition}
          onClose={() => setShowAddPosition(false)}
          onAddMany={addPositions}
          apiKey={settings.apiKey}
          finnhubKey={settings.finnhubKey}
        />

        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          setSettings={setSettingsState}
          onReset={reset}
          portfolio={portfolio}
          watchlist={watchlist}
          onImport={(data) => {
            setPortfolio(migrateDD(data.portfolio || []));
            setWatchlist(Array.isArray(data.watchlist) ? data.watchlist : []);
            if (data.settings?.fx) {
              setSettingsState((s) => ({ ...s, fx: { ...DEFAULT_FX, ...data.settings.fx, CHF: 1 } }));
            }
          }}
        />

        {showOnboarding && <Onboarding onClose={finishOnboarding} />}
      </div>
    </div>
  );
}
