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

// ─── Contract code helpers ────────────────────────────────────────────────────

/**
 * Parse a contract code like "AU2606" into { base:"AU", yy:26, mm:6 }
 */
function parseContract(code: string) {
  const base = code.match(/^[A-Za-z]+/)?.[0].toUpperCase() ?? '';
  const digits = code.slice(base.length);
  return { base, yy: parseInt(digits.slice(0, 2)), mm: parseInt(digits.slice(2)) };
}

/**
 * Generate a list of contract codes going backwards from the given code.
 * Gold/Silver: even months (2,4,6,8,10,12)
 * Crude (SC): all months
 */
function previousContracts(currentCode: string, count: number): string[] {
  const { base, yy, mm } = parseContract(currentCode);
  const isEven = base === 'AU' || base === 'AG';
  const step = isEven ? 2 : 1;

  const codes: string[] = [];
  let y = yy, m = mm;
  for (let i = 0; i < count; i++) {
    m -= step;
    if (m <= 0) { m += 12; y -= 1; }
    const code = `${base}${String(y).padStart(2, '0')}${String(m).padStart(2, '0')}`;
    codes.push(code);
  }
  return codes;
}

// ─── Sina Finance: get active contract code ────────────────────────────────────

/**
 * Calls Sina Finance to get the current main contract code (e.g., "AU2606")
 */
async function getActiveContract(sinaCode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://hq.sinajs.cn/list=${sinaCode}`, {
      headers: { 'User-Agent': UA, Referer: 'https://finance.sina.com.cn/' },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/hq_str_[^=]+="([^,]+)/);
    return match ? match[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

// ─── Eastmoney: fetch historical klines ───────────────────────────────────────

interface Kline { date: string; close: number }

async function fetchEastmoneyKlines(secId: string, begDate: string): Promise<Kline[]> {
  const url =
    `https://push2his.eastmoney.com/api/qt/stock/kline/get` +
    `?secid=${secId}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58` +
    `&klt=101&fqt=1&beg=${begDate}&end=20500101&lmt=500` +
    `&ut=fa5fd1943c7b386f172d6893dbfba10b`;
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
}

/** Fetch multiple contracts and merge, sorted by date ascending */
async function fetchChinaHistory(
  market: string,        // "113" for SHFE, "142" for INE
  currentCode: string,   // e.g. "AU2606"
  begDate: string,
): Promise<Kline[]> {
  // Try current + up to 3 previous contracts to cover longer ranges
  const codes = [currentCode, ...previousContracts(currentCode, 3)];
  const all = await Promise.allSettled(
    codes.map((c) => fetchEastmoneyKlines(`${market}.${c}`, begDate))
  );

  const dateMap = new Map<string, number>();
  for (const r of all) {
    if (r.status !== 'fulfilled') continue;
    for (const k of r.value) {
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
}

// ─── Commodity configs ─────────────────────────────────────────────────────────

interface CommodityConfig {
  sinaCode: string;
  market: string;
  yahooSymbol: string;
  /** Convert China daily close (in CNY per native unit) → same unit as Yahoo (USD) */
  convert: (chinaClose: number, usdCny: number) => number;
}

const CONFIGS: Record<string, CommodityConfig> = {
  gold: {
    sinaCode: 'nf_AU0',
    market: '113',
    yahooSymbol: 'GC=F',
    // AU: CNY/g  →  USD/troy oz
    convert: (p, r) => (p * 31.1035) / r,
  },
  silver: {
    sinaCode: 'nf_AG0',
    market: '113',
    yahooSymbol: 'SI=F',
    // AG: CNY/kg  →  USD/troy oz
    convert: (p, r) => p / r / (1000 / 31.1035),
  },
  crude: {
    sinaCode: 'nf_SC0',
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
  const begDate = daysAgo(RANGE_DAYS[range]);

  // Resolve active China contract code
  const activeCode = await getActiveContract(cfg.sinaCode);
  if (!activeCode) return [];

  // Fetch all three data series in parallel
  const [chinaKlines, intlKlines, rateKlines] = await Promise.all([
    fetchChinaHistory(cfg.market, activeCode, begDate),
    fetchYahooHistory(cfg.yahooSymbol, yahooRange),
    fetchYahooHistory('USDCNY=X', yahooRange),
  ]);

  // Build date-indexed maps
  const chinaMap = new Map(chinaKlines.map((k) => [k.date, k.close]));
  const intlMap = new Map(intlKlines.map((k) => [k.date, k.close]));
  const rateMap = new Map(rateKlines.map((k) => [k.date, k.close]));

  // Fill missing exchange rates by carrying forward the last known value
  let lastRate = 7.25;
  const allDates = [...new Set([...chinaMap.keys(), ...intlMap.keys()])].sort();
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
