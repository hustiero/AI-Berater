import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Home, Briefcase, ArrowLeftRight, Eye, MessageCircle, Plus, X, Trash2,
  Settings as SettingsIcon, TrendingUp, TrendingDown, Send, RotateCcw,
  Sparkles, AlertTriangle, ChevronRight, ArrowLeft, Loader2, Check,
  Filter, ArrowUpDown, ShieldAlert, Info,
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
   AI Call (Anthropic)
   ========================================================= */

async function callClaude({ system, messages }) {
  // Falls Artifact-Runtime ein window.claude.complete bereitstellt, nutze es
  if (typeof window !== 'undefined' && window.claude && typeof window.claude.complete === 'function') {
    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
      .join('\n\n');
    const prompt = `${system}\n\n${transcript}\n\nASSISTANT:`;
    const out = await window.claude.complete(prompt);
    return typeof out === 'string' ? out : (out?.completion || '');
  }
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system,
      messages,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`API ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data?.content?.[0]?.text || '';
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

function Dashboard({ portfolio, fx, onAssess }) {
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
        <div className="space-y-2">
          {winners.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{p.name}</p>
                <p className="text-neutral-500 text-xs">{p.ticker}</p>
              </div>
              <PerfText value={p.plPct} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          Top-3 Verlierer
        </h3>
        <div className="space-y-2">
          {losers.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{p.name}</p>
                <p className="text-neutral-500 text-xs">{p.ticker}</p>
              </div>
              <PerfText value={p.plPct} />
            </div>
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
   Position-Detail-Modal
   ========================================================= */

function PositionDetail({ position, trades, fx, onClose, onUpdate, onDelete, onLogTrade }) {
  const [note, setNote] = useState(position.note || '');
  const [stopLoss, setStopLoss] = useState(position.stopLoss ?? '');
  const [sellShares, setSellShares] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellNote, setSellNote] = useState('');
  const [sellFee, setSellFee] = useState('');

  const p = computePosition(position, fx);
  const positionTrades = trades.filter((t) => t.ticker === position.ticker);

  const saveMeta = () => {
    onUpdate({
      ...position,
      note,
      stopLoss: stopLoss === '' || stopLoss == null ? null : parseFloat(stopLoss),
    });
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
        </Card>

        <Card className="p-4">
          <h4 className="text-white font-semibold mb-2">Aktueller Kurs aktualisieren</h4>
          <TextField
            label="Neuer Kurs"
            type="number"
            step="0.01"
            value={position.currentPrice}
            onChange={(v) => onUpdate({ ...position, currentPrice: parseFloat(v) || 0 })}
          />
        </Card>

        <Card className="p-4">
          <h4 className="text-white font-semibold mb-2">Notiz / These</h4>
          <TextArea value={note} onChange={setNote} placeholder="Warum hältst du diese Position?" />
          <TextField
            label={`Stop-Loss (${position.currency})`}
            type="number"
            step="0.01"
            value={stopLoss}
            onChange={setStopLoss}
            placeholder="z.B. 18.50"
          />
          <PrimaryBtn onClick={saveMeta}>Speichern</PrimaryBtn>
        </Card>

        <Card className="p-4">
          <h4 className="text-white font-semibold mb-2">Verkauf loggen</h4>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Anzahl" type="number" value={sellShares} onChange={setSellShares} />
            <TextField label={`Preis (${position.currency})`} type="number" step="0.01" value={sellPrice} onChange={setSellPrice} />
          </div>
          <TextField label="Gebühren" type="number" step="0.01" value={sellFee} onChange={setSellFee} />
          <TextArea label="Notiz" value={sellNote} onChange={setSellNote} placeholder="Warum verkaufst du?" rows={2} />
          <PrimaryBtn onClick={sell} disabled={!sellShares || !sellPrice}>
            Verkauf eintragen
          </PrimaryBtn>
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

function AddPositionModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({
    ticker: '',
    name: '',
    assetClass: ASSET_CLASSES[0],
    shares: '',
    costBasis: '',
    currentPrice: '',
    currency: 'CHF',
    purchaseDate: new Date().toISOString().slice(0, 10),
    note: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.ticker || !form.name || !form.shares || !form.costBasis) return;
    const shares = parseFloat(form.shares);
    const costBasis = parseFloat(form.costBasis);
    const currentPrice = parseFloat(form.currentPrice) || costBasis;
    onAdd({
      id: uid(),
      ticker: form.ticker.toUpperCase(),
      name: form.name,
      assetClass: form.assetClass,
      shares,
      costBasis,
      currentPrice,
      currency: form.currency,
      purchaseDate: form.purchaseDate,
      note: form.note,
      stopLoss: null,
    });
    onClose();
    setForm({
      ticker: '', name: '', assetClass: ASSET_CLASSES[0], shares: '', costBasis: '',
      currentPrice: '', currency: 'CHF', purchaseDate: new Date().toISOString().slice(0, 10), note: '',
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neue Position"
      footer={<PrimaryBtn onClick={submit}>Hinzufügen</PrimaryBtn>}
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Ticker" value={form.ticker} onChange={(v) => set('ticker', v)} placeholder="NOVN" />
        <TextField label="Name" value={form.name} onChange={(v) => set('name', v)} placeholder="Novartis" />
      </div>
      <SelectField label="Asset-Klasse" value={form.assetClass} onChange={(v) => set('assetClass', v)} options={ASSET_CLASSES} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Anzahl" type="number" step="0.01" value={form.shares} onChange={(v) => set('shares', v)} />
        <SelectField label="Währung" value={form.currency} onChange={(v) => set('currency', v)} options={CURRENCIES} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Einstandskurs" type="number" step="0.01" value={form.costBasis} onChange={(v) => set('costBasis', v)} />
        <TextField label="Aktueller Kurs" type="number" step="0.01" value={form.currentPrice} onChange={(v) => set('currentPrice', v)} placeholder="optional" />
      </div>
      <TextField label="Kaufdatum" type="date" value={form.purchaseDate} onChange={(v) => set('purchaseDate', v)} />
      <TextArea label="Notiz / These" value={form.note} onChange={(v) => set('note', v)} />
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

function WatchlistTab({ watchlist, onAdd, onRemove, onConvert }) {
  const [showAdd, setShowAdd] = useState(false);
  const [convertItem, setConvertItem] = useState(null);

  return (
    <div className="px-4 pb-28 pt-4 space-y-3">
      <button
        onClick={() => setShowAdd(true)}
        className="w-full bg-orange-500 text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Hinzufügen
      </button>

      {watchlist.map((w) => (
        <Card key={w.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold">{w.name}</p>
                <Pill color={w.source === 'ai' ? 'accent' : 'blue'}>
                  {w.source === 'ai' ? 'vom AI' : 'von mir'}
                </Pill>
              </div>
              <p className="text-neutral-500 text-xs mt-0.5">{w.ticker}</p>
              {w.triggerPrice != null && (
                <p className="text-neutral-300 text-sm mt-1">
                  Trigger: {fmtCcy(w.triggerPrice, w.currency)}
                </p>
              )}
              {w.thesis && (
                <p className="text-neutral-400 text-sm mt-1 italic">„{w.thesis}"</p>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => setConvertItem(w)}
                className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg text-xs font-medium"
              >
                Kaufen
              </button>
              <button onClick={() => onRemove(w.id)}>
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
    </div>
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
      note: item.thesis,
      stopLoss: null,
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

function CoachTab({ portfolio, trades, watchlist, fx, chatHistory, setChatHistory, onAddWatchlistFromAI, assessmentTrigger, onAssessmentDone }) {
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
    const portfolioSummary = portfolio.map((p) => {
      const c = computePosition(p, fx);
      return {
        ticker: p.ticker, name: p.name, assetClass: p.assetClass,
        shares: p.shares, currency: p.currency,
        costBasis: p.costBasis, currentPrice: p.currentPrice,
        mvCHF: Math.round(c.mvCHF), plPct: Number(c.plPct.toFixed(2)),
        stopLoss: p.stopLoss,
      };
    });
    const totalCHF = portfolio.reduce((s, p) => s + toCHF(p.shares * p.currentPrice, p.currency, fx), 0);
    return `Du bist ein erfahrener, ehrlicher Finanzberater für einen Schweizer Privatanleger. Du sprichst Deutsch (Du-Form). Du bist direkt, datenbasiert und nicht zu vorsichtig. Du erinnerst den User an Disziplin (Stop-Losses, Gewinnmitnahmen, Diversifikation). Du schmeichelst nicht. Du erwähnst Steuer-Aspekte der Schweiz wenn relevant (keine Kapitalgewinnsteuer privat). Du kannst Aktien zur Watchlist vorschlagen mit dem Format: [WATCHLIST_VORSCHLAG: TICKER | NAME | THESE]. Nutze dieses Format wörtlich, wenn du eine konkrete Aktie empfiehlst aufzunehmen.

KONTEXT:
Total Portfolio CHF: ${Math.round(totalCHF)}
FX-Raten (in CHF): ${JSON.stringify(fx)}

Portfolio (JSON):
${JSON.stringify(portfolioSummary, null, 2)}

Trades-History (JSON):
${JSON.stringify(trades.slice(-30), null, 2)}

Watchlist (JSON):
${JSON.stringify(watchlist, null, 2)}`;
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
      const prompt = 'Mache ein vollständiges Assessment dieses Portfolios. Strukturiert mit: 1) Stärken, 2) Risiken/Klumpen, 3) Konkrete Handlungsempfehlungen (3-5 Punkte), 4) Eine Aktie zum eventuellen Verkauf, 5) Eine Aktie für die Watchlist als Ergänzung.';
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

  const stripSuggestions = (text) =>
    text.replace(/\[WATCHLIST_VORSCHLAG:[^\]]*\]/g, '').trim();

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
          const cleaned = !isUser ? stripSuggestions(m.content) : m.content;
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
   Settings Modal
   ========================================================= */

function SettingsModal({ open, onClose, settings, setSettings, onReset }) {
  const [fx, setFx] = useState(settings.fx);
  useEffect(() => setFx(settings.fx), [settings.fx, open]);

  const save = () => {
    setSettings({ ...settings, fx: {
      CHF: 1,
      USD: parseFloat(fx.USD) || DEFAULT_FX.USD,
      EUR: parseFloat(fx.EUR) || DEFAULT_FX.EUR,
      SEK: parseFloat(fx.SEK) || DEFAULT_FX.SEK,
    }});
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Einstellungen"
      footer={<PrimaryBtn onClick={save}>Speichern</PrimaryBtn>}
    >
      <Card className="p-4 mb-3">
        <h4 className="text-white font-semibold mb-2">FX-Raten (zu CHF)</h4>
        <TextField label="1 USD =" type="number" step="0.0001" value={fx.USD} onChange={(v) => setFx({ ...fx, USD: v })} />
        <TextField label="1 EUR =" type="number" step="0.0001" value={fx.EUR} onChange={(v) => setFx({ ...fx, EUR: v })} />
        <TextField label="1 SEK =" type="number" step="0.0001" value={fx.SEK} onChange={(v) => setFx({ ...fx, SEK: v })} />
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

function TopBar({ title, onSettings }) {
  return (
    <header className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-neutral-900 pt-[max(env(safe-area-inset-top),0.5rem)]">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <h1 className="text-white font-bold text-lg">{title}</h1>
        <IconBtn onClick={onSettings}>
          <SettingsIcon className="w-5 h-5 text-neutral-400" />
        </IconBtn>
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
      setPortfolio(p ?? DEMO_PORTFOLIO);
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
  const deletePosition = (id) =>
    setPortfolio((arr) => arr.filter((x) => x.id !== id));
  const addPosition = (pos) => setPortfolio((arr) => [pos, ...arr]);

  // Trade handlers
  const addTrade = (t) => setTrades((arr) => [t, ...arr]);
  const deleteTrade = (id) => setTrades((arr) => arr.filter((x) => x.id !== id));

  // Watchlist handlers
  const addWatchlist = (w) => setWatchlist((arr) => [w, ...arr]);
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
        <TopBar title={titleMap[tab]} onSettings={() => setShowSettings(true)} />

        {tab === 'dashboard' && (
          <Dashboard portfolio={portfolio} fx={fx} onAssess={triggerAssessment} />
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
            onAdd={addWatchlist}
            onRemove={removeWatchlist}
            onConvert={convertWatchlist}
          />
        )}
        {tab === 'coach' && (
          <CoachTab
            portfolio={portfolio}
            trades={trades}
            watchlist={watchlist}
            fx={fx}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            onAddWatchlistFromAI={addWatchlistFromAI}
            assessmentTrigger={assessmentTrigger}
            onAssessmentDone={() => {}}
          />
        )}

        <BottomNav tab={tab} setTab={setTab} />

        {openPos && (
          <PositionDetail
            position={openPos}
            trades={trades}
            fx={fx}
            onClose={() => setOpenPositionId(null)}
            onUpdate={updatePosition}
            onDelete={deletePosition}
            onLogTrade={addTrade}
          />
        )}

        <AddPositionModal
          open={showAddPosition}
          onClose={() => setShowAddPosition(false)}
          onAdd={addPosition}
        />

        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          setSettings={setSettingsState}
          onReset={reset}
        />

        {showOnboarding && <Onboarding onClose={finishOnboarding} />}
      </div>
    </div>
  );
}
