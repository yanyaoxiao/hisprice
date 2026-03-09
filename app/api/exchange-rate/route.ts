import { NextResponse } from 'next/server';
import { fetchExchangeRate } from '@/lib/fetchers';

let cache: { rate: number; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ data: { usdCny: cache.rate, timestamp: cache.timestamp }, success: true, timestamp: now });
    }
    const rate = await fetchExchangeRate();
    cache = { rate, timestamp: now };
    return NextResponse.json({ data: { usdCny: rate, timestamp: now }, success: true, timestamp: now });
  } catch (error) {
    return NextResponse.json({ data: { usdCny: 7.25, timestamp: Date.now() }, success: false, error: String(error), timestamp: Date.now() });
  }
}
