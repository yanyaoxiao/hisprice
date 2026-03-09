const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export interface SpreadHistoryPoint {
  date: string;       // "2025-01-15"
  spread: number;     // intlPrice - chinaConverted (in display unit)
  chinaPrice: number; // converted to same unit as intl
  intlPrice: number;
  usdCny: number;
}

// ─── Range helpers ────────────────────────────────────────────────────────────

type Range = '1w' | '1m' | '3m' | '6m' | '1y';

const YAHOO_RANGE: Record<Range, string> = {
  '1w': '5d', '1m': '1mo', '3m': '3mo', '6m': '6mo', '1y': '1y',
};

/** Returns YYYYMMDD string N days ago */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

const RANGE_DAYS: Record<Range, number> = {
  '1w': 8, '1m': 35, '3m': 95, '6m': 185, '1y': 370,
};

// ─── Contract code generator ─────────────────────────────────────────────────

/**
 * Generate contract codes covering the past `lookbackMonths` from now.
 * AU/AG: even months only (2,4,6,8,10,12).
 * SC: all months.
 * Returns codes from most-recent to oldest.
 */
function generateContractCodes(base: string, lookbackMonths: number): string[] {
  const isEvenOnly = base === 'AU' || base === 'AG';
  const step = isEvenOnly ? 2 : 1;
  const totalSteps = Math.ceil(lookbackMonths / step) + 3; // buffer

  const now = new Date();
  let y = now.getFullYear() % 100; // 2-digit year
  let m = now.getMonth() + 1;      // 1-12

  // Round up to the next valid contract month (e.g., March → April for AU)
  if (isEvenOnly && m % 2 !== 0) m += 1;
  if (m > 12) { m -= 12; y += 1; }

  const codes: string[] = [];
  let cy = y, cm = m;
  for (let i = 0; i < totalSteps; i++) {
    codes.push(`${base}${String(cy).padStart(2, '0')}${String(cm).padStart(2, '0')}`);
    cm -= step;
    if (cm <= 0) { cm += 12; cy -= 1; }
  }
  return codes;
}

// ─── Eastmoney: fetch historical klines ───────────────────────────────────────

interface Kline { date: string; close: number }

async function fetchEastmoneyKlines(secId: string, begDate: string): Promise<Kline[]> {
  const url =
    `https://push2his.eastmoney.com/api/qt/stock/kline/get` +
    `?secid=${secId}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58` +
    `&klt=101&fqt=1&beg=${begDate}&end=20500101&lmt=500` +
    `&ut=fa5fd1943c7b386f172d6893dbfba10b`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: 'https://quote.eastmoney.com/' },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const klines: string[] = json?.data?.klines ?? [];
    return klines
      .map((k) => {
        const fields = k.split(',');
        return { date: fields[0], close: parseFloat(fields[2]) || 0 };
      })
      .filter((k) => k.close > 0);
  } catch {
    return [];
  }
}

/** Fetch multiple contracts and merge by date (most-recent contract wins). */
async function fetchChinaHistory(
  market: string,       // "113" for SHFE, "142" for INE
  base: string,         // "AU", "AG", "SC"
  range: Range,
): Promise<Kline[]> {
  const lookbackMonths = Math.ceil(RANGE_DAYS[range] / 30) + 2;
  const codes = generateContractCodes(base, lookbackMonths);
  const begDate = daysAgo(RANGE_DAYS[range]);

  const results = await Promise.allSettled(
    codes.map((c) => fetchEastmoneyKlines(`${market}.${c}`, begDate))
  );

  // Merge by date; if two contracts have the same date, prefer the more-recent contract
  // (codes are ordered from most-recent to oldest, so iterate in order)
  const dateMap = new Map<string, number>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const k of r.value) {
      // Only fill in a date if we haven't seen it yet (most-recent contract takes priority)
      if (!dateMap.has(k.date)) dateMap.set(k.date, k.close);
    }
  }

  return [...dateMap.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Yahoo Finance: fetch historical ─────────────────────────────────────────

async function fetchYahooHistory(symbol: string, range: string): Promise<Kline[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&range=${range}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    return timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close: closes[i] ?? 0,
      }))
      .filter((k) => k.close > 0);
  } catch {
    return [];
  }
}

// ─── Commodity configs ─────────────────────────────────────────────────────────

interface CommodityConfig {
  base: string;    // Eastmoney contract base, e.g. "AU"
  market: string;  // Eastmoney market id
  yahooSymbol: string;
  /** Convert China daily close (CNY/native unit) → same unit as Yahoo (USD) */
  convert: (chinaClose: number, usdCny: number) => number;
}

const CONFIGS: Record<string, CommodityConfig> = {
  gold: {
    base: 'AU',
    market: '113',
    yahooSymbol: 'GC=F',
    // AU: CNY/g  →  USD/troy oz
    convert: (p, r) => (p * 31.1035) / r,
  },
  silver: {
    base: 'AG',
    market: '113',
    yahooSymbol: 'SI=F',
    // AG: CNY/kg  →  USD/troy oz
    convert: (p, r) => p / r / (1000 / 31.1035),
  },
  crude: {
    base: 'SC',
    market: '142',
    yahooSymbol: 'CL=F',
    // SC: CNY/barrel  →  USD/barrel
    convert: (p, r) => p / r,
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchHistoricalSpread(
  commodity: string,
  range: Range,
): Promise<SpreadHistoryPoint[]> {
  const cfg = CONFIGS[commodity];
  if (!cfg) return [];

  const yahooRange = YAHOO_RANGE[range];

  // Fetch all three data series in parallel
  const [chinaKlines, intlKlines, rateKlines] = await Promise.all([
    fetchChinaHistory(cfg.market, cfg.base, range),
    fetchYahooHistory(cfg.yahooSymbol, yahooRange),
    fetchYahooHistory('USDCNY=X', yahooRange),
  ]);

  // Build date-indexed maps
  const chinaMap = new Map(chinaKlines.map((k) => [k.date, k.close]));
  const intlMap = new Map(intlKlines.map((k) => [k.date, k.close]));
  const rateMap = new Map(rateKlines.map((k) => [k.date, k.close]));

  // Union of all dates, sorted
  const allDates = [...new Set([...chinaMap.keys(), ...intlMap.keys()])].sort();

  // Forward-fill exchange rate for non-trading days
  let lastRate = 7.25;
  const filledRateMap = new Map<string, number>();
  for (const date of allDates) {
    if (rateMap.has(date)) lastRate = rateMap.get(date)!;
    filledRateMap.set(date, lastRate);
  }

  // Join and compute spread
  const result: SpreadHistoryPoint[] = [];
  for (const date of allDates) {
    const chinaClose = chinaMap.get(date);
    const intlClose = intlMap.get(date);
    if (!chinaClose || !intlClose) continue;
    const usdCny = filledRateMap.get(date) ?? 7.25;
    const chinaConverted = cfg.convert(chinaClose, usdCny);
    result.push({
      date,
      spread: intlClose - chinaConverted,
      chinaPrice: chinaConverted,
      intlPrice: intlClose,
      usdCny,
    });
  }

  return result;
}
