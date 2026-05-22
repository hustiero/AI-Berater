// AI-Berater – Google-Sheets-Sync
// In ein leeres Google-Sheet einfügen: Erweiterungen → Apps Script → Code in Code.gs ersetzen.
// Bereitstellen → Neue Bereitstellung → Web-App → Ausführen als „ICH" → Zugriff „JEDER (mit Link)".
// URL kopieren und in der App unter Einstellungen → Google-Sheets-Sync einfügen.

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
