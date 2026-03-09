import { NextResponse } from 'next/server';
import { PriceData } from '@/lib/types';

// Cache for 10 seconds
let cache: { data: PriceData[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 1000;

const INTL_FUTURES = [
  { symbol: 'GC=F', name: 'COMEX黄金', unit: 'USD/troy oz', exchange: 'COMEX' },
  { symbol: 'SI=F', name: 'COMEX白银', unit: 'USD/troy oz', exchange: 'COMEX' },
  { symbol: 'CL=F', name: 'WTI原油', unit: 'USD/桶', exchange: 'NYMEX' },
];

async function fetchYahooFinance(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('No meta data');
  return meta;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        data: cache.data,
        success: true,
        timestamp: now,
      });
    }

    const results = await Promise.allSettled(
      INTL_FUTURES.map((f) => fetchYahooFinance(f.symbol))
    );

    const prices: PriceData[] = INTL_FUTURES.map((f, i) => {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        const meta = result.value;
        const price = meta.regularMarketPrice ?? 0;
        const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
        const change = price - prevClose;
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
        return {
          symbol: f.symbol,
          name: f.name,
          price,
          change,
          changePercent,
          unit: f.unit,
          exchange: f.exchange,
          timestamp: now,
        };
      }
      return {
        symbol: f.symbol,
        name: f.name,
        price: 0,
        change: 0,
        changePercent: 0,
        unit: f.unit,
        exchange: f.exchange,
        timestamp: now,
      };
    });

    cache = { data: prices, timestamp: now };
    return NextResponse.json({ data: prices, success: true, timestamp: now });
  } catch (error) {
    return NextResponse.json(
      { data: [], success: false, error: String(error), timestamp: Date.now() },
      { status: 500 }
    );
  }
}
