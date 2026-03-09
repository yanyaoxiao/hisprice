import { NextResponse } from 'next/server';
import { fetchHistoricalSpread } from '@/lib/history-fetchers';

const VALID_COMMODITIES = new Set(['gold', 'silver', 'crude']);
const VALID_RANGES = new Set(['1w', '1m', '3m', '6m', '1y']);

// Server-side cache per commodity+range, 5 minutes
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const commodity = searchParams.get('commodity') ?? 'gold';
  const range = searchParams.get('range') ?? '1m';

  if (!VALID_COMMODITIES.has(commodity) || !VALID_RANGES.has(range)) {
    return NextResponse.json({ data: [], success: false, error: 'Invalid params' }, { status: 400 });
  }

  const key = `${commodity}:${range}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.ts < CACHE_TTL) {
    return NextResponse.json({ data: cached.data, success: true, cached: true, timestamp: now });
  }

  try {
    const data = await fetchHistoricalSpread(commodity, range as never);
    cache.set(key, { data, ts: now });
    return NextResponse.json({ data, success: true, cached: false, timestamp: now });
  } catch (error) {
    return NextResponse.json(
      { data: [], success: false, error: String(error), timestamp: now },
      { status: 500 }
    );
  }
}
