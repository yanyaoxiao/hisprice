import { NextResponse } from 'next/server';
import { PriceData } from '@/lib/types';
import { fetchInternationalPrices } from '@/lib/fetchers';

let cache: { data: PriceData[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ data: cache.data, success: true, timestamp: now });
    }
    const prices = await fetchInternationalPrices();
    cache = { data: prices, timestamp: now };
    return NextResponse.json({ data: prices, success: true, timestamp: now });
  } catch (error) {
    return NextResponse.json({ data: [], success: false, error: String(error), timestamp: Date.now() }, { status: 500 });
  }
}
