// Unit conversion constants
export const TROY_OZ_PER_GRAM = 1 / 31.1035; // 1 gram = 0.03215 troy oz
export const GRAMS_PER_TROY_OZ = 31.1035;
export const TROY_OZ_PER_KG = 1000 / 31.1035; // ~32.1507 troy oz per kg

// Futures contract specs
export const FUTURES_SPECS = {
  AU: {
    symbol: 'AU0',
    name: '沪金',
    exchange: '上交所',
    unit: 'CNY/g',
    lotSize: 1000, // grams per lot
    eastmoneySecId: '113.AU0',
  },
  AG: {
    symbol: 'AG0',
    name: '沪银',
    exchange: '上交所',
    unit: 'CNY/kg',
    lotSize: 15, // kg per lot
    eastmoneySecId: '113.AG0',
  },
  SC: {
    symbol: 'SC0',
    name: 'SC原油',
    exchange: '上期能源',
    unit: 'CNY/桶',
    lotSize: 1000, // barrels per lot
    eastmoneySecId: '142.SC0',
  },
  GC: {
    symbol: 'GC=F',
    name: 'COMEX黄金',
    exchange: 'COMEX',
    unit: 'USD/troy oz',
    lotSize: 100, // troy oz per lot
  },
  SI: {
    symbol: 'SI=F',
    name: 'COMEX白银',
    exchange: 'COMEX',
    unit: 'USD/troy oz',
    lotSize: 5000, // troy oz per lot
  },
  CL: {
    symbol: 'CL=F',
    name: 'WTI原油',
    exchange: 'NYMEX',
    unit: 'USD/桶',
    lotSize: 1000, // barrels per lot
  },
  BZ: {
    symbol: 'BZ=F',
    name: '布伦特原油',
    exchange: 'ICE',
    unit: 'USD/桶',
    lotSize: 1000,
  },
};

// Spread pair configs
export const SPREAD_PAIRS = [
  {
    id: 'gold',
    name: '黄金价差',
    nameEn: 'Gold Spread',
    china: 'AU',
    international: 'GC',
    icon: '🥇',
    color: 'yellow',
    description: '沪金 vs COMEX黄金',
    // AU: CNY/g → convert to USD/troy oz
    convertChina: (price: number, usdCnyRate: number) =>
      (price * GRAMS_PER_TROY_OZ) / usdCnyRate,
    displayUnit: 'USD/troy oz',
  },
  {
    id: 'silver',
    name: '白银价差',
    nameEn: 'Silver Spread',
    china: 'AG',
    international: 'SI',
    icon: '🥈',
    color: 'gray',
    description: '沪银 vs COMEX白银',
    // AG: CNY/kg → convert to USD/troy oz
    convertChina: (price: number, usdCnyRate: number) =>
      price / usdCnyRate / TROY_OZ_PER_KG,
    displayUnit: 'USD/troy oz',
  },
  {
    id: 'crude',
    name: '原油价差',
    nameEn: 'Crude Oil Spread',
    china: 'SC',
    international: 'CL',
    icon: '🛢️',
    color: 'blue',
    description: 'SC原油 vs WTI原油',
    // SC: CNY/barrel → convert to USD/barrel
    convertChina: (price: number, usdCnyRate: number) => price / usdCnyRate,
    displayUnit: 'USD/桶',
  },
];
