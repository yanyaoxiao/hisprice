import { NextResponse } from 'next/server';
import { SpreadData, PriceData } from '@/lib/types';
import { SPREAD_PAIRS } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const baseUrl = new URL(request.url).origin;

    // Fetch all data in parallel
    const [chinaRes, intlRes, rateRes] = await Promise.all([
      fetch(`${baseUrl}/api/prices/china`, { next: { revalidate: 0 } }),
      fetch(`${baseUrl}/api/prices/international`, { next: { revalidate: 0 } }),
      fetch(`${baseUrl}/api/exchange-rate`, { next: { revalidate: 0 } }),
    ]);

    const [chinaJson, intlJson, rateJson] = await Promise.all([
      chinaRes.json(),
      intlRes.json(),
      rateRes.json(),
    ]);

    const chinaPrices: PriceData[] = chinaJson.data ?? [];
    const intlPrices: PriceData[] = intlJson.data ?? [];
    const usdCnyRate: number = rateJson.data?.usdCny ?? 7.25;

    const now = Date.now();

    const spreads: SpreadData[] = SPREAD_PAIRS.map((pair) => {
      const chinaPrice = chinaPrices.find((p) => p.symbol.startsWith(pair.china));
      const intlPrice = intlPrices.find((p) => p.symbol === pair.international + '=F' || p.symbol.startsWith(pair.international));

      const chinaPriceVal = chinaPrice?.price ?? 0;
      const intlPriceVal = intlPrice?.price ?? 0;

      const chinaPriceConverted = pair.convertChina(chinaPriceVal, usdCnyRate);
      const spread = intlPriceVal - chinaPriceConverted;
      const spreadPercent =
        chinaPriceConverted !== 0 ? (spread / chinaPriceConverted) * 100 : 0;

      const premiumDiscount: SpreadData['premiumDiscount'] =
        Math.abs(spreadPercent) < 0.1
          ? 'parity'
          : spread > 0
          ? 'premium'
          : 'discount';

      return {
        id: pair.id,
        name: pair.name,
        nameEn: pair.nameEn,
        icon: pair.icon,
        description: pair.description,
        displayUnit: pair.displayUnit,
        chinaPrice: chinaPrice ?? {
          symbol: pair.china,
          name: pair.china,
          price: 0,
          change: 0,
          changePercent: 0,
          unit: '',
          exchange: '',
          timestamp: now,
        },
        intlPrice: intlPrice ?? {
          symbol: pair.international,
          name: pair.international,
          price: 0,
          change: 0,
          changePercent: 0,
          unit: '',
          exchange: '',
          timestamp: now,
        },
        chinaPriceConverted,
        spread,
        spreadPercent,
        premiumDiscount,
        usdCnyRate,
        timestamp: now,
      };
    });

    return NextResponse.json({
      data: spreads,
      success: true,
      usdCnyRate,
      timestamp: now,
    });
  } catch (error) {
    return NextResponse.json(
      { data: [], success: false, error: String(error), timestamp: Date.now() },
      { status: 500 }
    );
  }
}
