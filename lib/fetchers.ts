import { PriceData } from './types';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ─── Exchange Rate ────────────────────────────────────────────────────────────

export async function fetchExchangeRate(): Promise<number> {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDCNY=X?interval=1m&range=1d',
      { headers: { 'User-Agent': UA }, next: { revalidate: 0 } }
    );
    if (res.ok) {
      const json = await res.json();
      const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && price > 0) return price;
    }
  } catch {}
  return 7.25;
}

// ─── International Futures (Yahoo Finance) ────────────────────────────────────

const INTL_FUTURES = [
  { symbol: 'GC=F', name: 'COMEX黄金', unit: 'USD/troy oz', exchange: 'COMEX' },
  { symbol: 'SI=F', name: 'COMEX白银', unit: 'USD/troy oz', exchange: 'COMEX' },
  { symbol: 'CL=F', name: 'WTI原油', unit: 'USD/桶', exchange: 'NYMEX' },
];

async function fetchYahoo(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('No meta');
  return meta;
}

export async function fetchInternationalPrices(): Promise<PriceData[]> {
  const now = Date.now();
  const results = await Promise.allSettled(INTL_FUTURES.map((f) => fetchYahoo(f.symbol)));
  return INTL_FUTURES.map((f, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') {
      const meta = r.value;
      const price = meta.regularMarketPrice ?? 0;
      const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
      const change = price - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
      return { symbol: f.symbol, name: f.name, price, change, changePercent, unit: f.unit, exchange: f.exchange, timestamp: now };
    }
    return { symbol: f.symbol, name: f.name, price: 0, change: 0, changePercent: 0, unit: f.unit, exchange: f.exchange, timestamp: now };
  });
}

// ─── China Futures ───────────────────────────────────────────────────────────

const CHINA_FUTURES = [
  { symbol: 'AU0', sinaCode: 'nf_AU0', eastmoneySecId: '113.AU0', name: '沪金', unit: 'CNY/g', exchange: '上期所' },
  { symbol: 'AG0', sinaCode: 'nf_AG0', eastmoneySecId: '113.AG0', name: '沪银', unit: 'CNY/kg', exchange: '上期所' },
  { symbol: 'SC0', sinaCode: 'nf_SC0', eastmoneySecId: '142.SC0', name: 'SC原油', unit: 'CNY/桶', exchange: '上期能源' },
];

/**
 * Sina Finance futures API — accessible globally, no geo-restriction.
 * Response: var hq_str_nf_AU0="AU2506,黄金2506,open,high,low,price,prevSettle,settle,chg,chg%,...";
 * Field positions (0-indexed after splitting by comma):
 *   0: contract code, 1: name, 2: open, 3: high, 4: low,
 *   5: current price (现价), 6: prev settlement, 7: settlement, 8: change, 9: change%
 */
async function fetchSinaFutures(codes: string[]): Promise<Map<string, { price: number; change: number; changePercent: number }>> {
  const list = codes.join(',');
  const res = await fetch(
    `https://hq.sinajs.cn/list=${list}`,
    {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://finance.sina.com.cn/',
      },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) throw new Error(`Sina HTTP ${res.status}`);
  const text = await res.text();
  const result = new Map<string, { price: number; change: number; changePercent: number }>();

  for (const line of text.split('\n')) {
    const match = line.match(/hq_str_(nf_\w+)="([^"]*)"/);
    if (!match) continue;
    const code = match[1];
    const fields = match[2].split(',');
    if (fields.length < 10 || !fields[5]) continue;

    const price = parseFloat(fields[5]) || 0;
    const change = parseFloat(fields[8]) || 0;
    // change% field may be like "0.05%" — strip the %
    const changePercentStr = fields[9]?.replace('%', '') ?? '0';
    const changePercent = parseFloat(changePercentStr) || 0;

    result.set(code, { price, change, changePercent });
  }
  return result;
}

/** Eastmoney fallback (may not work outside China) */
async function fetchEastmoney(secId: string) {
  const fields = 'f43,f169,f170';
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secId}&fields=${fields}&ut=fa5fd1943c7b386f172d6893dbfba10b&fltt=2&invt=2`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Referer': 'https://quote.eastmoney.com/' },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`EM HTTP ${res.status}`);
  const json = await res.json();
  const d = json?.data;
  if (!d) throw new Error('EM no data');
  return {
    price: (d.f43 ?? 0) / 100,
    change: (d.f169 ?? 0) / 100,
    changePercent: (d.f170 ?? 0) / 100,
  };
}

export async function fetchChinaPrices(): Promise<PriceData[]> {
  const now = Date.now();

  // Try Sina Finance first (globally accessible)
  try {
    const sinaData = await fetchSinaFutures(CHINA_FUTURES.map((f) => f.sinaCode));
    if (sinaData.size > 0) {
      return CHINA_FUTURES.map((f) => {
        const d = sinaData.get(f.sinaCode);
        return {
          symbol: f.symbol,
          name: f.name,
          price: d?.price ?? 0,
          change: d?.change ?? 0,
          changePercent: d?.changePercent ?? 0,
          unit: f.unit,
          exchange: f.exchange,
          timestamp: now,
        };
      });
    }
  } catch {}

  // Fallback: Eastmoney (may fail outside China)
  const results = await Promise.allSettled(CHINA_FUTURES.map((f) => fetchEastmoney(f.eastmoneySecId)));
  return CHINA_FUTURES.map((f, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') {
      return { symbol: f.symbol, name: f.name, ...r.value, unit: f.unit, exchange: f.exchange, timestamp: now };
    }
    return { symbol: f.symbol, name: f.name, price: 0, change: 0, changePercent: 0, unit: f.unit, exchange: f.exchange, timestamp: now };
  });
}
