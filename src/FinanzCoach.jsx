import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Home, Briefcase, ArrowLeftRight, Eye, MessageCircle, Plus, X, Trash2,
  Settings as SettingsIcon, TrendingUp, TrendingDown, Send, RotateCcw,
  Sparkles, AlertTriangle, ChevronRight, ArrowLeft, Loader2, Check,
  Filter, ArrowUpDown, ShieldAlert, Info, Pencil, Flame, Microscope,
  RefreshCw, Cloud, CloudUpload, CloudDownload, Copy,
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

async function fetchYahooViaProxy(ticker) {
  // Yahoo Finance v8 chart endpoint via corsproxy.io (kein Key, internationale Coverage).
  // Wir probieren mehrere Exchange-Suffixe, falls der reine Ticker (z.B. NOVN) nicht trifft.
  const candidates = ticker.includes('.') ? [ticker] : EXCHANGE_SUFFIXES.map((s) => ticker + s);
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
async function getMarketData(ticker, finnhubKey, { withProfile = false } = {}) {
  const t = normalizeTicker(ticker);
  const cached = quoteCache.get(t);
  if (cached && Date.now() - cached.ts < QUOTE_TTL_MS && !withProfile) return cached.data;

  let quote = await fetchFinnhubQuote(t, finnhubKey);
  let profile = withProfile ? await fetchFinnhubProfile(t, finnhubKey) : null;
  let yahoo = null;

  // Fallback: Yahoo für non-US oder wenn Finnhub leer
  if (!quote || (withProfile && !profile)) {
    yahoo = await fetchYahooViaProxy(t);
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

  if (data.price != null) quoteCache.set(t, { ts: Date.now(), data });
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
    drafts.map((d) => getMarketData(d.ticker, finnhubKey, { withProfile: true }).catch(() => null))
  );

  const merged = drafts.map((d, i) => {
    const m = market[i] || {};
    return {
      tempId: d.tempId,
      ticker: normalizeTicker(d.ticker),
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

const DD_FIELDS_AI_WRITABLE = ['thesis', 'strengths', 'risks', 'catalysts', 'fundamentals'];
const DD_LIST_FIELDS = ['strengths', 'risks', 'catalysts', 'tags'];
const DD_TEXT_FIELDS = ['thesis', 'fundamentals', 'userNotes'];
const DD_HISTORY_CAP = 5;

function emptyDD() {
  return {
    thesis: '',
    strengths: [],
    risks: [],
    catalysts: [],
    fundamentals: '',
    userNotes: '',
    tags: [],
    lastAnalyzedAt: null,
    lastAnalysisModel: '',
    history: [],
  };
}

function ensureDD(position) {
  if (position.dueDiligence && typeof position.dueDiligence === 'object') {
    const d = position.dueDiligence;
    return {
      ...emptyDD(),
      ...d,
      strengths: Array.isArray(d.strengths) ? d.strengths : [],
      risks: Array.isArray(d.risks) ? d.risks : [],
      catalysts: Array.isArray(d.catalysts) ? d.catalysts : [],
      tags: Array.isArray(d.tags) ? d.tags : [],
      history: Array.isArray(d.history) ? d.history : [],
    };
  }
  // Migration: alte Position ohne DD. note → thesis.
  return { ...emptyDD(), thesis: position.note || '' };
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
  "summary": "1 Satz für die History, max 120 Zeichen"
}

WICHTIG: Ergänze, korrigiere nicht aggressiv. Bestehende User-Notes (separates Feld) fasst du NIE an.`;

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

  // Merge: AI-Felder werden ersetzt, userNotes/tags/history bleiben unangetastet
  const next = { ...current };
  for (const f of DD_FIELDS_AI_WRITABLE) {
    if (parsed[f] !== undefined) next[f] = parsed[f];
  }
  next.lastAnalyzedAt = Date.now();
  next.lastAnalysisModel = MODEL_COACH;
  return appendDDHistory(next, {
    ts: Date.now(),
    source: 'deep',
    summary: parsed.summary || (parsed.thesis || '').slice(0, 120),
    model: MODEL_COACH,
  });
}

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

const TRENDING_CACHE_KEY = 'trendingApewisdomCache';
const TRENDING_TTL_MS = 60 * 60 * 1000;

async function fetchTrendingApewisdom({ force = false } = {}) {
  const cached = await storage.get(TRENDING_CACHE_KEY);
  if (!force && cached && Date.now() - cached.ts < TRENDING_TTL_MS) {
    return cached.data;
  }
  const url = 'https://apewisdom.io/api/v1.0/filter/wallstreetbets/page/1';
  const r = await fetch(url);
  if (!r.ok) throw new Error(`apewisdom ${r.status}`);
  const d = await r.json();
  const top = (d?.results || []).slice(0, 5).map((x) => ({
    ticker: String(x.ticker || '').toUpperCase(),
    name: x.name || x.ticker,
    mentions: Number(x.mentions) || 0,
    mentions24h: Number(x.mentions_24h_ago) || 0,
    rank: Number(x.rank) || null,
    rankPrev: Number(x.rank_24h_ago) || null,
  }));
  await storage.set(TRENDING_CACHE_KEY, { ts: Date.now(), data: top });
  return top;
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

function Dashboard({ portfolio, fx, onAssess, onOpenPosition }) {
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

  const sortedByPct = [...computed].sort((a, b) => b.plPct - a.plPct);
  const winners = sortedByPct.slice(0, 3);
  const losers = sortedByPct.slice(-3).reverse();

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
        PORTFOLIO ASSESSMENT
      </button>

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

      <Card className="p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          Top-3 Gewinner
        </h3>
        <div className="space-y-1">
          {winners.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpenPosition?.(p.id)}
              className="w-full flex items-center justify-between gap-2 py-1.5 px-1 rounded-lg hover:bg-neutral-800/60 active:bg-neutral-800 transition text-left"
            >
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{p.name}</p>
                <p className="text-neutral-500 text-xs">{p.ticker}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <PerfText value={p.plPct} />
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          Top-3 Verlierer
        </h3>
        <div className="space-y-1">
          {losers.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpenPosition?.(p.id)}
              className="w-full flex items-center justify-between gap-2 py-1.5 px-1 rounded-lg hover:bg-neutral-800/60 active:bg-neutral-800 transition text-left"
            >
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{p.name}</p>
                <p className="text-neutral-500 text-xs">{p.ticker}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <PerfText value={p.plPct} />
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
   Portfolio Tab
   ========================================================= */

function PortfolioList({ portfolio, fx, onOpenPosition, onAddPosition }) {
  const [sort, setSort] = useState('mv');
  const computed = useMemo(
    () => portfolio.map((p) => computePosition(p, fx)),
    [portfolio, fx]
  );
  const sorted = useMemo(() => {
    const arr = [...computed];
    if (sort === 'mv') arr.sort((a, b) => b.mvCHF - a.mvCHF);
    if (sort === 'perf') arr.sort((a, b) => b.plPct - a.plPct);
    if (sort === 'name') arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [computed, sort]);

  return (
    <div className="px-4 pb-28 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { v: 'mv', l: 'Wert' },
            { v: 'perf', l: 'Perf.' },
            { v: 'name', l: 'Name' },
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

      {sorted.map((p) => (
        <button
          key={p.id}
          onClick={() => onOpenPosition(p.id)}
          className="w-full text-left"
        >
          <Card className="p-4 active:bg-neutral-800/60 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold truncate">{p.name}</p>
                  <Pill>{p.currency}</Pill>
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
            <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
              <span>Einstand {fmtCcy(p.costBasis, p.currency)}</span>
              <span className={p.plLocal >= 0 ? 'text-green-400' : 'text-red-400'}>
                {p.plLocal >= 0 ? '+' : ''}
                {fmtCcy(p.plLocal, p.currency)}
              </span>
              {p.stopLoss != null && (
                <span className="flex items-center gap-1 text-orange-400">
                  <ShieldAlert className="w-3 h-3" /> SL {fmtCcy(p.stopLoss, p.currency)}
                </span>
              )}
            </div>
          </Card>
        </button>
      ))}

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

function DueDiligenceEditor({ position, onUpdate, apiKey }) {
  const [dd, setDd] = useState(() => ensureDD(position));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [highlightUntil, setHighlightUntil] = useState(0);

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
      const next = await analyzePositionDeep(position, { apiKey });
      // userNotes/tags aus aktuellem (vielleicht ungespeichertem) Local-State holen
      const merged = { ...next, userNotes: dd.userNotes, tags: dd.tags };
      setDd(merged);
      setHighlightUntil(Date.now() + 4000);
      onUpdate({ ...position, dueDiligence: merged, note: merged.thesis || position.note || '' });
    } catch (e) {
      setError(e.message || 'Deep-Analyse fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const isFresh = highlightUntil > Date.now();
  const ago = dd.lastAnalyzedAt
    ? Math.max(0, Math.round((Date.now() - dd.lastAnalyzedAt) / 60000))
    : null;
  const agoLabel = !dd.lastAnalyzedAt
    ? 'Noch keine AI-Analyse'
    : ago < 60 ? `AI-Analyse: vor ${ago} Min`
    : ago < 60 * 24 ? `AI-Analyse: vor ${Math.round(ago / 60)} h`
    : `AI-Analyse: vor ${Math.round(ago / 60 / 24)} Tagen`;

  return (
    <Card className={`p-4 transition ${isFresh ? 'ring-1 ring-orange-500/40' : ''}`}>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <h4 className="text-white font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" /> Due Diligence
          </h4>
          <p className="text-[11px] text-neutral-500 mt-0.5">{agoLabel}</p>
        </div>
        <button
          onClick={runDeepAnalysis}
          disabled={loading || !apiKey}
          title={!apiKey ? 'Anthropic API-Key in Einstellungen' : ''}
          className="flex items-center gap-1.5 bg-orange-500/15 hover:bg-orange-500/25 disabled:opacity-40 text-orange-400 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0"
        >
          {loading ? <Spinner size={3} /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'Analysiere…' : 'Tief analysieren'}
        </button>
      </div>

      {error && (
        <div className="mb-3 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
        </div>
      )}

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

      <BulletEditor
        label="Tags"
        items={dd.tags}
        onChange={(v) => setField('tags', v)}
        accent="blue"
        placeholder="+ Tag (z.B. defensiv, dividend, AI-Welle)"
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
    </Card>
  );
}

/* =========================================================
   Position-Detail-Modal
   ========================================================= */

function PositionDetail({ position, trades, fx, onClose, onUpdate, onDelete, onLogTrade, apiKey, onUpdateWithCascade, onAskCoach }) {
  const [stopLoss, setStopLoss] = useState(position.stopLoss ?? '');
  const [sellShares, setSellShares] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellNote, setSellNote] = useState('');
  const [sellFee, setSellFee] = useState('');
  const [sellManualOpen, setSellManualOpen] = useState(false);

  // Stammdaten-Edit (collapsed by default)
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

  // Nachkauf
  const [addOpen, setAddOpen] = useState(false);
  const [addShares, setAddShares] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [addFee, setAddFee] = useState('');
  const [addLogTrade, setAddLogTrade] = useState(false);
  const [addError, setAddError] = useState('');

  const p = computePosition(position, fx);
  const positionTrades = trades.filter((t) => t.ticker === position.ticker);

  const saveStopLoss = () => {
    onUpdate({
      ...position,
      stopLoss: stopLoss === '' || stopLoss == null ? null : parseFloat(stopLoss),
    });
  };

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
    const next = {
      ...position,
      ticker: newTicker,
      name: edit.name.trim(),
      assetClass: edit.assetClass,
      currency: edit.currency,
      purchaseDate: edit.purchaseDate,
      shares: newShares,
      costBasis: newCost,
    };
    if (newTicker !== position.ticker || edit.currency !== position.currency) {
      try { quoteCache.delete(normalizeTicker(position.ticker)); } catch {}
    }
    if (onUpdateWithCascade && newTicker !== position.ticker) {
      onUpdateWithCascade(next, position.ticker);
    } else {
      onUpdate(next);
    }
    setEditOpen(false);
  };

  const submitAddPosition = () => {
    setAddError('');
    const sh = parseFloat(addShares);
    const pr = parseFloat(addPrice);
    if (!Number.isFinite(sh) || sh <= 0) return setAddError('Anzahl ungültig.');
    if (!Number.isFinite(pr) || pr <= 0) return setAddError('Kurs ungültig.');
    const newShares = position.shares + sh;
    const totalCost = position.shares * position.costBasis + sh * pr;
    const newCost = totalCost / newShares;
    const updated = { ...position, shares: newShares, costBasis: newCost };
    const ddNow = ensureDD(updated);
    updated.dueDiligence = appendDDHistory(ddNow, {
      ts: Date.now(),
      source: 'manual',
      summary: `+${sh} ${position.ticker} @ ${pr} ${position.currency}`,
      model: '',
    });
    onUpdate(updated);
    if (addLogTrade) {
      onLogTrade({
        id: uid(),
        date: addDate,
        side: 'buy',
        ticker: position.ticker,
        name: position.name,
        shares: sh,
        price: pr,
        currency: position.currency,
        fee: parseFloat(addFee) || 0,
        note: 'Nachkauf',
      });
    }
    setAddShares(''); setAddPrice(''); setAddFee('');
    setAddOpen(false);
  };

  const askCoachSell = () => {
    if (!onAskCoach) return;
    const prompt = `Soll ich meine Position in ${position.name} (${position.ticker}) verkaufen? Ich halte ${position.shares} Stück, Einstand ${position.costBasis} ${position.currency}, aktueller Kurs ${position.currentPrice} ${position.currency} (${p.plPct.toFixed(1)}% P/L). Bitte berücksichtige aktuelle Bewertung, Risiken, Catalysts und mache eine klare Empfehlung (halten / teilverkauf / komplett verkaufen).`;
    onAskCoach(prompt);
    onClose();
  };

  const sell = () => {
    const sh = parseFloat(sellShares);
    const pr = parseFloat(sellPrice);
    if (!sh || !pr || sh <= 0) return;
    onLogTrade({
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      side: 'sell',
      ticker: position.ticker,
      name: position.name,
      shares: sh,
      price: pr,
      currency: position.currency,
      fee: parseFloat(sellFee) || 0,
      note: sellNote,
    });
    const remaining = position.shares - sh;
    if (remaining <= 0) {
      onDelete(position.id);
    } else {
      onUpdate({ ...position, shares: remaining });
    }
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title={position.name}>
      <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-neutral-500 text-xs">Ticker</p>
                <p className="text-white">{position.ticker}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Asset-Klasse</p>
                <p className="text-white">{position.assetClass}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Anzahl</p>
                <p className="text-white">{position.shares}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Währung</p>
                <p className="text-white">{position.currency}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Einstand</p>
                <p className="text-white">{fmtCcy(position.costBasis, position.currency)}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Aktueller Kurs</p>
                <p className="text-white">{fmtCcy(position.currentPrice, position.currency)}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">Marktwert</p>
                <p className="text-white">{fmtCHF(p.mvCHF)}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs">P/L</p>
                <PerfText value={p.plPct} />
              </div>
            </div>
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
                <p className="text-[11px] text-orange-300 mb-2">Ticker ändert sich → bestehende Trades werden mitgeführt, Kurs wird beim nächsten Refresh neu geholt.</p>
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

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-semibold text-sm">Nachkauf</h4>
            <button
              onClick={() => setAddOpen((x) => !x)}
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
            >
              <Plus className="w-3.5 h-3.5" /> {addOpen ? 'Schliessen' : 'Hinzufügen'}
            </button>
          </div>
          {!addOpen ? (
            <p className="text-neutral-500 text-xs">Position aufstocken → Anzahl und Cost-Basis werden anteilig neu berechnet.</p>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Anzahl" type="number" step="0.0001" value={addShares} onChange={setAddShares} />
                <TextField label={`Kurs (${position.currency})`} type="number" step="0.01" value={addPrice} onChange={setAddPrice} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Datum" type="date" value={addDate} onChange={setAddDate} />
                <TextField label="Gebühren" type="number" step="0.01" value={addFee} onChange={setAddFee} />
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-400 mb-3 select-none">
                <input
                  type="checkbox"
                  checked={addLogTrade}
                  onChange={(e) => setAddLogTrade(e.target.checked)}
                  className="accent-orange-500"
                />
                Auch als Trade loggen (optional)
              </label>
              {addShares && addPrice && (
                <p className="text-[11px] text-neutral-400 mb-2">
                  Neue Position: {(position.shares + parseFloat(addShares || 0)).toFixed(2)} Stück, Cost-Basis {(((position.shares * position.costBasis) + (parseFloat(addShares || 0) * parseFloat(addPrice || 0))) / (position.shares + parseFloat(addShares || 0))).toFixed(2)} {position.currency}
                </p>
              )}
              {addError && (
                <div className="mb-2 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {addError}
                </div>
              )}
              <PrimaryBtn onClick={submitAddPosition} disabled={!addShares || !addPrice}>Nachkauf eintragen</PrimaryBtn>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h4 className="text-white font-semibold mb-2">Kurs & Stop-Loss</h4>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Aktueller Kurs (Override)"
              type="number"
              step="0.01"
              value={position.currentPrice}
              onChange={(v) => onUpdate({ ...position, currentPrice: parseFloat(v) || 0 })}
            />
            <TextField
              label={`Stop-Loss (${position.currency})`}
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={setStopLoss}
              placeholder="z.B. 18.50"
            />
          </div>
          <PrimaryBtn onClick={saveStopLoss}>Stop-Loss speichern</PrimaryBtn>
        </Card>

        <DueDiligenceEditor position={position} onUpdate={onUpdate} apiKey={apiKey} />

        <Card className="p-4">
          <h4 className="text-white font-semibold mb-2">Verkauf-Check</h4>
          <p className="text-neutral-400 text-xs mb-3">
            Lass den Coach analysieren, ob ein (Teil-)Verkauf gerade Sinn macht – Bewertung, Risiken, Catalysts.
          </p>
          <PrimaryBtn onClick={askCoachSell} disabled={!onAskCoach}>
            Coach: soll ich verkaufen?
          </PrimaryBtn>
          <button
            onClick={() => setSellManualOpen((x) => !x)}
            className="mt-3 flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${sellManualOpen ? 'rotate-90' : ''}`} />
            Verkauf manuell eintragen
          </button>
          {sellManualOpen && (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Anzahl" type="number" value={sellShares} onChange={setSellShares} />
                <TextField label={`Preis (${position.currency})`} type="number" step="0.01" value={sellPrice} onChange={setSellPrice} />
              </div>
              <TextField label="Gebühren" type="number" step="0.01" value={sellFee} onChange={setSellFee} />
              <TextArea label="Notiz" value={sellNote} onChange={setSellNote} placeholder="Warum verkaufst du?" rows={2} />
              <PrimaryBtn onClick={sell} disabled={!sellShares || !sellPrice}>
                Verkauf eintragen
              </PrimaryBtn>
            </div>
          )}
        </Card>

        {positionTrades.length > 0 && (
          <Card className="p-4">
            <h4 className="text-white font-semibold mb-2">Trade-Historie</h4>
            <div className="space-y-2">
              {positionTrades.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <Pill color={t.side === 'buy' ? 'green' : 'red'}>
                      {t.side === 'buy' ? 'BUY' : 'SELL'}
                    </Pill>
                    <span className="text-neutral-400 ml-2">{t.date}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white tabular-nums">{t.shares} × {fmtCcy(t.price, t.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

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
   Trades Tab
   ========================================================= */

function TradesTab({ trades, portfolio, fx, onAddTrade, onDeleteTrade }) {
  const [filterTicker, setFilterTicker] = useState('');
  const [filterSide, setFilterSide] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    return trades
      .filter((t) => !filterTicker || t.ticker.toLowerCase().includes(filterTicker.toLowerCase()))
      .filter((t) => filterSide === 'all' || t.side === filterSide)
      .filter((t) => !filterFrom || t.date >= filterFrom)
      .filter((t) => !filterTo || t.date <= filterTo)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [trades, filterTicker, filterSide, filterFrom, filterTo]);

  // YTD realisierte P/L: für jeden Sell-Trade dieses Jahres, schätze Einstand
  const ytdRealized = useMemo(() => {
    const year = new Date().getFullYear().toString();
    const sells = trades.filter((t) => t.side === 'sell' && t.date.startsWith(year));
    let totalCHF = 0;
    for (const s of sells) {
      const pos = portfolio.find((p) => p.ticker === s.ticker);
      const cost = pos ? pos.costBasis : s.price;
      const plLocal = (s.price - cost) * s.shares - (s.fee || 0);
      totalCHF += toCHF(plLocal, s.currency, fx);
    }
    return totalCHF;
  }, [trades, portfolio, fx]);

  return (
    <div className="px-4 pb-28 pt-4 space-y-3">
      <Card className="p-4">
        <p className="text-neutral-400 text-xs">Realisiert YTD ({new Date().getFullYear()})</p>
        <p className={`text-2xl font-bold mt-1 ${ytdRealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {ytdRealized >= 0 ? '+' : ''}
          {fmtCHF(ytdRealized)}
        </p>
        <p className="text-neutral-500 text-xs mt-1 flex items-center gap-1">
          <Info className="w-3 h-3" /> Schweiz: privat keine Kapitalgewinnsteuer
        </p>
      </Card>

      <Card className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-neutral-400 text-xs">
          <Filter className="w-3 h-3" /> Filter
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={filterTicker}
            onChange={(e) => setFilterTicker(e.target.value)}
            placeholder="Ticker"
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <select
            value={filterSide}
            onChange={(e) => setFilterSide(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="all">Alle</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
      </Card>

      <button
        onClick={() => setShowAdd(true)}
        className="w-full bg-orange-500 text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Neuer Trade
      </button>

      {filtered.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Pill color={t.side === 'buy' ? 'green' : 'red'}>
                  {t.side === 'buy' ? 'BUY' : 'SELL'}
                </Pill>
                <span className="text-white font-semibold">{t.ticker}</span>
                <span className="text-neutral-500 text-xs">{t.date}</span>
              </div>
              <p className="text-neutral-300 text-sm mt-1">
                {t.shares} × {fmtCcy(t.price, t.currency)}
                {t.fee ? ` · Geb. ${fmtCcy(t.fee, t.currency)}` : ''}
              </p>
              {t.note && <p className="text-neutral-500 text-xs mt-1 italic">„{t.note}"</p>}
            </div>
            <button onClick={() => onDeleteTrade(t.id)}>
              <Trash2 className="w-4 h-4 text-neutral-500 hover:text-red-400" />
            </button>
          </div>
        </Card>
      ))}

      {filtered.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-neutral-400">Noch keine Trades.</p>
        </Card>
      )}

      <AddTradeModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={onAddTrade} portfolio={portfolio} />
    </div>
  );
}

function AddTradeModal({ open, onClose, onAdd, portfolio }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    side: 'buy',
    ticker: '',
    name: '',
    shares: '',
    price: '',
    currency: 'CHF',
    fee: '',
    note: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.ticker || !form.shares || !form.price) return;
    onAdd({
      id: uid(),
      date: form.date,
      side: form.side,
      ticker: form.ticker.toUpperCase(),
      name: form.name,
      shares: parseFloat(form.shares),
      price: parseFloat(form.price),
      currency: form.currency,
      fee: parseFloat(form.fee) || 0,
      note: form.note,
    });
    onClose();
    setForm({
      date: new Date().toISOString().slice(0, 10),
      side: 'buy', ticker: '', name: '', shares: '', price: '', currency: 'CHF', fee: '', note: '',
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neuer Trade"
      footer={<PrimaryBtn onClick={submit}>Hinzufügen</PrimaryBtn>}
    >
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Seite" value={form.side} onChange={(v) => set('side', v)} options={['buy', 'sell']} />
        <TextField label="Datum" type="date" value={form.date} onChange={(v) => set('date', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Ticker" value={form.ticker} onChange={(v) => set('ticker', v)} placeholder="NOVN" />
        <TextField label="Name" value={form.name} onChange={(v) => set('name', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Anzahl" type="number" step="0.01" value={form.shares} onChange={(v) => set('shares', v)} />
        <TextField label="Preis" type="number" step="0.01" value={form.price} onChange={(v) => set('price', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Währung" value={form.currency} onChange={(v) => set('currency', v)} options={CURRENCIES} />
        <TextField label="Gebühren" type="number" step="0.01" value={form.fee} onChange={(v) => set('fee', v)} />
      </div>
      <TextArea label="These / Notiz" value={form.note} onChange={(v) => set('note', v)} placeholder="Warum dieser Trade?" />
    </Modal>
  );
}

/* =========================================================
   Watchlist Tab
   ========================================================= */

function WatchlistTab({ watchlist, portfolio, onAdd, onAddMany, onRemove, onUpdate, onConvert, apiKey, onAskCoach }) {
  const [showAdd, setShowAdd] = useState(false);
  const [convertItem, setConvertItem] = useState(null);
  const [ddItem, setDdItem] = useState(null);

  return (
    <div className="px-4 pb-28 pt-4 space-y-3">
      <TrendingCard onAddWatchlist={onAdd} watchlist={watchlist} onAskCoach={onAskCoach} />

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

      {watchlist.map((w) => (
        <Card key={w.id} className="p-4">
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
              </div>
              <p className="text-neutral-500 text-xs mt-0.5">{w.ticker} · {w.currency}</p>
              {w.triggerPrice != null && (
                <p className="text-neutral-300 text-sm mt-1">
                  Trigger: {fmtCcy(w.triggerPrice, w.currency)}
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
      ))}

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

function TrendingCard({ onAddWatchlist, watchlist, onAskCoach }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ts, setTs] = useState(null);

  const load = async (force = false) => {
    setLoading(true);
    setErr('');
    try {
      const d = await fetchTrendingApewisdom({ force });
      setData(d);
      const cached = await storage.get(TRENDING_CACHE_KEY);
      setTs(cached?.ts || Date.now());
    } catch (e) {
      setErr('Trending nicht erreichbar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(false); }, []);

  const ago = ts ? Math.max(0, Math.round((Date.now() - ts) / 60000)) : null;
  const onWatchlist = new Set(watchlist.map((w) => w.ticker.toUpperCase()));

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white font-semibold flex items-center gap-1.5 text-sm">
          <Flame className="w-4 h-4 text-orange-400" /> Trending r/wallstreetbets
        </h4>
        <button onClick={() => load(true)} disabled={loading} className="text-neutral-400 hover:text-white disabled:opacity-40">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>
      {err && <p className="text-neutral-500 text-xs italic">{err} – App funktioniert weiter.</p>}
      {!err && data.length === 0 && !loading && (
        <p className="text-neutral-500 text-xs">Noch keine Daten.</p>
      )}
      <div className="space-y-1.5">
        {data.map((t) => {
          const already = onWatchlist.has(t.ticker);
          const rankDelta = t.rankPrev != null && t.rank != null ? t.rankPrev - t.rank : null;
          return (
            <div key={t.ticker} className="flex items-center justify-between gap-2 py-1">
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">
                  {t.ticker} <span className="text-neutral-500 font-normal">· {t.name}</span>
                </p>
                <p className="text-[11px] text-neutral-500">
                  {t.mentions} Mentions
                  {rankDelta != null && rankDelta !== 0 && (
                    <span className={rankDelta > 0 ? 'text-green-400 ml-1' : 'text-red-400 ml-1'}>
                      {rankDelta > 0 ? `↑${rankDelta}` : `↓${-rankDelta}`}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => {
                    if (already) return;
                    onAddWatchlist({
                      id: uid(),
                      ticker: t.ticker,
                      name: t.name,
                      triggerPrice: null,
                      currency: 'USD',
                      thesis: 'Trending in r/wallstreetbets',
                      source: 'ai',
                      addedAt: new Date().toISOString(),
                    });
                  }}
                  disabled={already}
                  className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-white p-1.5 rounded-lg"
                  title={already ? 'Schon auf Watchlist' : 'Auf Watchlist'}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAskCoach?.(`Was sagst du zu ${t.ticker} (${t.name})? Aktuelle Lage, Bewertung, Risiken. Es ist gerade trending in r/wallstreetbets mit ${t.mentions} Mentions – ist das ein Signal oder Noise?`)}
                  className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 p-1.5 rounded-lg"
                  title="Coach analysieren"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {ago != null && (
        <p className="text-[10px] text-neutral-600 mt-2">
          Aktualisiert {ago === 0 ? 'gerade' : `vor ${ago} Min`} · apewisdom.io
        </p>
      )}
    </Card>
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
      const next = await analyzePositionDeep(pseudoPosition, { apiKey });
      setDd({ ...next, userNotes: dd.userNotes, tags: dd.tags });
    } catch (e) {
      setErr(e.message || 'Deep-Analyse fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
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
            {loading ? 'Analysiere…' : 'Tief analysieren'}
          </button>
        </div>
        {err && (
          <div className="mb-3 text-red-300 text-xs flex items-start gap-1.5 bg-red-950/40 border border-red-500/40 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {err}
          </div>
        )}
        <TextArea label="Thesis" value={dd.thesis} onChange={(v) => setField('thesis', v)} rows={2} placeholder="Warum interessant?" />
        <BulletEditor label="Stärken" items={dd.strengths} onChange={(v) => setField('strengths', v)} accent="green" />
        <BulletEditor label="Risiken" items={dd.risks} onChange={(v) => setField('risks', v)} accent="red" />
        <BulletEditor label="Catalysts" items={dd.catalysts} onChange={(v) => setField('catalysts', v)} accent="orange" />
        <TextArea label="Fundamentals" value={dd.fundamentals} onChange={(v) => setField('fundamentals', v)} placeholder="P/E, Margen, Verschuldung…" rows={3} />
        <TextArea label="Eigene Notizen" value={dd.userNotes} onChange={(v) => setField('userNotes', v)} rows={2} />
        <PrimaryBtn onClick={save}>DD speichern</PrimaryBtn>
      </Card>
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

function CoachTab({ portfolio, trades, watchlist, fx, apiKey, chatHistory, setChatHistory, onAddWatchlistFromAI, onApplyDDUpdate, assessmentTrigger, onAssessmentDone, pendingQuestion, onPendingQuestionConsumed }) {
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

[NEED_DD: TICKER]
  → Du brauchst tiefere Daten zu dieser Position, der User soll eine Deep-Analyse anstoßen.

KONTEXT:
Total Portfolio CHF: ${Math.round(totalCHF)}
FX (in CHF): ${JSON.stringify(fx)}

Portfolio (Compact-JSON, eine Zeile pro Position):
${portfolioSummary.map((x) => JSON.stringify(x)).join('\n')}

Trades-History (letzte 30):
${JSON.stringify(trades.slice(-30))}

Watchlist:
${JSON.stringify(watchlist)}`;
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

  // Pending-Question vom App-State (z.B. "soll ich X verkaufen?", "was sagst du zu Y?")
  useEffect(() => {
    if (pendingQuestion && pendingQuestion.text) {
      send(pendingQuestion.text);
      onPendingQuestionConsumed?.();
    }
    // eslint-disable-next-line
  }, [pendingQuestion?.id]);

  const parseSuggestions = (text) => {
    const re = /\[WATCHLIST_VORSCHLAG:\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^\]]+?)\s*\]/g;
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      out.push({ ticker: m[1].trim().toUpperCase(), name: m[2].trim(), thesis: m[3].trim() });
    }
    return out;
  };

  // [POSITION_DD: TICKER | field | <op> <value>]
  const parsePositionDDUpdates = (text) => {
    const re = /\[POSITION_DD:\s*([^|]+?)\s*\|\s*([a-zA-Z]+)\s*\|\s*([+\-=])\s*([^\]]+?)\s*\]/g;
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
              Frag mich alles zu deinem Portfolio. Ich kenne deine Positionen, Trades und Watchlist.
            </p>
            <div className="mt-3 space-y-2">
              {[
                'Wo habe ich gerade ein Klumpenrisiko?',
                'Welche Position sollte ich genauer prüfen?',
                'Wie ist mein Exposure gegenüber AI-Infra?',
                'Gibt es einen sinnvollen Hedge für mein Portfolio?',
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
                          onAccept={() => onApplyDDUpdate?.(u)}
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

function DDUpdateCard({ update, knownTicker, onAccept }) {
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

  if (skipped) return null;

  return (
    <div className="bg-neutral-900 border border-blue-500/40 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">
          DD-Update · {update.ticker}
        </p>
        <Pill color="blue">{opLabel} {fieldLabel}</Pill>
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
            className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-40 text-blue-300 font-medium py-1.5 rounded-lg text-xs"
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

function SettingsModal({ open, onClose, settings, setSettings, onReset, portfolio, trades, watchlist, onImport }) {
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
      await gasPush(url, { portfolio, trades, watchlist });
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
      version: 1,
      exportedAt: new Date().toISOString(),
      portfolio,
      trades,
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
      if (!confirm(`Backup vom ${data.exportedAt?.slice(0,10) || '?'} importieren? Überschreibt Portfolio (${data.portfolio.length}), Trades (${data.trades?.length || 0}) und Watchlist (${data.watchlist?.length || 0}).`)) {
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
        <p>Dein persönlicher AI-Finanzberater – direkt auf dem Homescreen.</p>
        <ul className="space-y-2">
          <li className="flex gap-2"><Home className="w-4 h-4 mt-0.5 text-orange-400" /> <span><b>Dashboard</b>: Total CHF, Performance, Donut-Charts, Top Gewinner/Verlierer.</span></li>
          <li className="flex gap-2"><Briefcase className="w-4 h-4 mt-0.5 text-orange-400" /> <span><b>Portfolio</b>: Alle Positionen verwalten, Stop-Losses, Notizen, Verkäufe loggen.</span></li>
          <li className="flex gap-2"><ArrowLeftRight className="w-4 h-4 mt-0.5 text-orange-400" /> <span><b>Trades</b>: Trade-Journal mit These, YTD realisierte Gewinne.</span></li>
          <li className="flex gap-2"><Eye className="w-4 h-4 mt-0.5 text-orange-400" /> <span><b>Watchlist</b>: Beobachtete Werte mit Trigger-Preisen.</span></li>
          <li className="flex gap-2"><MessageCircle className="w-4 h-4 mt-0.5 text-orange-400" /> <span><b>Coach</b>: AI-Chat, der dein gesamtes Portfolio kennt.</span></li>
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
    { id: 'trades', icon: ArrowLeftRight, label: 'Trades' },
    { id: 'watchlist', icon: Eye, label: 'Watchlist' },
    { id: 'coach', icon: MessageCircle, label: 'Coach' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur border-t border-neutral-800 pb-[max(env(safe-area-inset-bottom),0.25rem)] z-40">
      <div className="grid grid-cols-5 max-w-md mx-auto">
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
  const [trades, setTrades] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [settings, setSettingsState] = useState({ fx: DEFAULT_FX });
  const [openPositionId, setOpenPositionId] = useState(null);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [assessmentTrigger, setAssessmentTrigger] = useState(0);
  const [pendingCoachQuestion, setPendingCoachQuestion] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Initial Load
  useEffect(() => {
    (async () => {
      const [p, t, w, c, s, onb] = await Promise.all([
        storage.get('portfolio'),
        storage.get('trades'),
        storage.get('watchlist'),
        storage.get('chatHistory'),
        storage.get('settings'),
        storage.get('onboardingSeen'),
      ]);
      setPortfolio(migrateDD(p ?? DEMO_PORTFOLIO));
      setTrades(t ?? []);
      setWatchlist(w ?? DEMO_WATCHLIST);
      setChatHistory(c ?? []);
      setSettingsState(s ?? { fx: DEFAULT_FX });
      if (!onb) setShowOnboarding(true);
      setHydrated(true);
    })();
  }, []);

  // Persist
  useEffect(() => { if (hydrated) storage.set('portfolio', portfolio); }, [portfolio, hydrated]);
  useEffect(() => { if (hydrated) storage.set('trades', trades); }, [trades, hydrated]);
  useEffect(() => { if (hydrated) storage.set('watchlist', watchlist); }, [watchlist, hydrated]);
  useEffect(() => { if (hydrated) storage.set('chatHistory', chatHistory); }, [chatHistory, hydrated]);
  useEffect(() => { if (hydrated) storage.set('settings', settings); }, [settings, hydrated]);

  const fx = settings.fx || DEFAULT_FX;

  // Position handlers
  const updatePosition = (pos) =>
    setPortfolio((arr) => arr.map((x) => (x.id === pos.id ? pos : x)));
  const updatePositionWithCascade = (pos, oldTicker) => {
    setPortfolio((arr) => arr.map((x) => (x.id === pos.id ? pos : x)));
    if (oldTicker && oldTicker !== pos.ticker) {
      setTrades((arr) => arr.map((t) => (t.ticker === oldTicker ? { ...t, ticker: pos.ticker } : t)));
    }
  };
  const deletePosition = (id) =>
    setPortfolio((arr) => arr.filter((x) => x.id !== id));
  const addPosition = (pos) => setPortfolio((arr) => [pos, ...arr]);
  const addPositions = (positions) => setPortfolio((arr) => [...positions, ...arr]);

  const askCoach = (text) => {
    setTab('coach');
    setPendingCoachQuestion({ id: uid(), text });
  };

  // DD-Updates aus dem Coach-Assessment auf eine Position anwenden.
  // update: { ticker, field, op: '+'|'-'|'=', value }
  // Gibt true zurück, wenn die Position gefunden und gemerged wurde.
  const applyDDUpdate = (update) => {
    let applied = false;
    setPortfolio((arr) => arr.map((p) => {
      if (p.ticker !== update.ticker) return p;
      if (update.field === 'userNotes' || update.field === 'tags') return p; // AI darf das nicht
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

  // Live-Kurs Refresh
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refreshAllQuotes = async (force = false) => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const updated = await Promise.all(
        portfolio.map(async (p) => {
          if (force) quoteCache.delete(normalizeTicker(p.ticker));
          const m = await getMarketData(p.ticker, settings.finnhubKey).catch(() => null);
          if (!m || m.price == null) return p;
          return { ...p, currentPrice: m.price, lastQuoteAt: Date.now(), quoteSource: m.source };
        })
      );
      setPortfolio(updated);
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

  // Trade handlers
  const addTrade = (t) => setTrades((arr) => [t, ...arr]);
  const deleteTrade = (id) => setTrades((arr) => arr.filter((x) => x.id !== id));

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
    setPortfolio(DEMO_PORTFOLIO);
    setTrades([]);
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
    trades: 'Trades',
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
            onOpenPosition={(id) => setOpenPositionId(id)}
          />
        )}
        {tab === 'portfolio' && (
          <PortfolioList
            portfolio={portfolio}
            fx={fx}
            onOpenPosition={(id) => setOpenPositionId(id)}
            onAddPosition={() => setShowAddPosition(true)}
          />
        )}
        {tab === 'trades' && (
          <TradesTab
            trades={trades}
            portfolio={portfolio}
            fx={fx}
            onAddTrade={addTrade}
            onDeleteTrade={deleteTrade}
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
            onAskCoach={askCoach}
          />
        )}
        {tab === 'coach' && (
          <CoachTab
            portfolio={portfolio}
            trades={trades}
            watchlist={watchlist}
            fx={fx}
            apiKey={settings.apiKey}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            onAddWatchlistFromAI={addWatchlistFromAI}
            onApplyDDUpdate={applyDDUpdate}
            assessmentTrigger={assessmentTrigger}
            onAssessmentDone={() => {}}
            pendingQuestion={pendingCoachQuestion}
            onPendingQuestionConsumed={() => setPendingCoachQuestion(null)}
          />
        )}

        <BottomNav tab={tab} setTab={setTab} />

        {openPos && (
          <PositionDetail
            position={openPos}
            trades={trades}
            fx={fx}
            apiKey={settings.apiKey}
            onClose={() => setOpenPositionId(null)}
            onUpdate={updatePosition}
            onUpdateWithCascade={updatePositionWithCascade}
            onDelete={deletePosition}
            onLogTrade={addTrade}
            onAskCoach={askCoach}
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
          trades={trades}
          watchlist={watchlist}
          onImport={(data) => {
            setPortfolio(migrateDD(data.portfolio || []));
            setTrades(Array.isArray(data.trades) ? data.trades : []);
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
