export interface PriceData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  exchange: string;
  timestamp: number;
}

export interface ExchangeRate {
  usdCny: number;
  timestamp: number;
}

export interface SpreadData {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  displayUnit: string;
  chinaPrice: PriceData;
  intlPrice: PriceData;
  chinaPriceConverted: number; // China price converted to same unit as intl
  spread: number; // intl - china_converted
  spreadPercent: number; // spread / intl * 100
  premiumDiscount: 'premium' | 'discount' | 'parity';
  usdCnyRate: number;
  timestamp: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
}
