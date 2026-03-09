import { NextResponse } from 'next/server';
import { SpreadData } from '@/lib/types';
import { SPREAD_PAIRS } from '@/lib/constants';
import { fetchChinaPrices, fetchInternationalPrices, fetchExchangeRate } from '@/lib/fetchers';

export async function GET() {
  try {
    const [chinaPrices, intlPrices, usdCnyRate] = await Promise.all([
      fetchChinaPrices(),
      fetchInternationalPrices(),
      fetchExchangeRate(),
    ]);

    const now = Date.now();

    const spreads: SpreadData[] = SPREAD_PAIRS.map((pair) => {
      const chinaPrice = chinaPrices.find((p) => p.symbol.startsWith(pair.china));
      const intlPrice = intlPrices.find(
        (p) => p.symbol === pair.international + '=F' || p.symbol.startsWith(pair.international)
      );

      const chinaPriceVal = chinaPrice?.price ?? 0;
      const intlPriceVal = intlPrice?.price ?? 0;

      const chinaPriceConverted = pair.convertChina(chinaPriceVal, usdCnyRate);
      const spread = intlPriceVal - chinaPriceConverted;
      const spreadPercent = chinaPriceConverted !== 0 ? (spread / chinaPriceConverted) * 100 : 0;

      const premiumDiscount: SpreadData['premiumDiscount'] =
        Math.abs(spreadPercent) < 0.1 ? 'parity' : spread > 0 ? 'premium' : 'discount';

      return {
        id: pair.id,
        name: pair.name,
        nameEn: pair.nameEn,
        icon: pair.icon,
        description: pair.description,
        displayUnit: pair.displayUnit,
        chinaPrice: chinaPrice ?? {
          symbol: pair.china, name: pair.china, price: 0, change: 0,
          changePercent: 0, unit: '', exchange: '', timestamp: now,
        },
        intlPrice: intlPrice ?? {
          symbol: pair.international, name: pair.international, price: 0, change: 0,
          changePercent: 0, unit: '', exchange: '', timestamp: now,
        },
        chinaPriceConverted,
        spread,
        spreadPercent,
        premiumDiscount,
        usdCnyRate,
        timestamp: now,
      };
    });

    return NextResponse.json({ data: spreads, success: true, usdCnyRate, timestamp: now });
  } catch (error) {
    return NextResponse.json(
      { data: [], success: false, error: String(error), timestamp: Date.now() },
      { status: 500 }
    );
  }
}
