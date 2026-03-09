import { NextResponse } from 'next/server';

// Cache exchange rate for 60 seconds
let cache: { rate: number; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

async function fetchExchangeRate(): Promise<number> {
  // Try Yahoo Finance first
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDCNY=X?interval=1m&range=1d',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 0 },
      }
    );
    if (res.ok) {
      const json = await res.json();
      const price =
        json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && price > 0) return price;
    }
  } catch {}

  // Fallback: use a reasonable default if APIs fail
  return 7.25;
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        data: { usdCny: cache.rate, timestamp: cache.timestamp },
        success: true,
        timestamp: now,
      });
    }

    const rate = await fetchExchangeRate();
    cache = { rate, timestamp: now };

    return NextResponse.json({
      data: { usdCny: rate, timestamp: now },
      success: true,
      timestamp: now,
    });
  } catch (error) {
    return NextResponse.json(
      {
        data: { usdCny: 7.25, timestamp: Date.now() },
        success: false,
        error: String(error),
        timestamp: Date.now(),
      },
      { status: 200 }
    );
  }
}
