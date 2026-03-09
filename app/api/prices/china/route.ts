import { NextResponse } from 'next/server';
import { PriceData } from '@/lib/types';

// Cache for 10 seconds
let cache: { data: PriceData[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 1000;

const CHINA_FUTURES = [
  {
    secId: '113.AU0',
    symbol: 'AU0',
    name: '沪金',
    unit: 'CNY/g',
    exchange: '上期所',
  },
  {
    secId: '113.AG0',
    symbol: 'AG0',
    name: '沪银',
    unit: 'CNY/kg',
    exchange: '上期所',
  },
  {
    secId: '142.SC0',
    symbol: 'SC0',
    name: 'SC原油',
    unit: 'CNY/桶',
    exchange: '上期能源',
  },
];

async function fetchEastmoney(secId: string) {
  const fields = 'f43,f44,f45,f46,f47,f48,f57,f58,f169,f170';
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secId}&fields=${fields}&ut=fa5fd1943c7b386f172d6893dbfba10b&fltt=2&invt=2`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://quote.eastmoney.com/',
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json?.data;
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
      CHINA_FUTURES.map((f) => fetchEastmoney(f.secId))
    );

    const prices: PriceData[] = CHINA_FUTURES.map((f, i) => {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        const d = result.value;
        // f43: current price (x100), f169: change amount, f170: change percent
        const price = (d.f43 ?? 0) / 100;
        const change = (d.f169 ?? 0) / 100;
        const changePercent = (d.f170 ?? 0) / 100;
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
