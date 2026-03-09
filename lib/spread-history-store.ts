'use client';

import { SpreadHistoryPoint } from './history-fetchers';
import { SpreadData } from './types';

const LS_KEY = 'hisprice_history_v1';
const MAX_DAYS = 730; // keep up to 2 years

type CommodityId = 'gold' | 'silver' | 'crude';

type Store = Record<CommodityId, Record<string, SpreadHistoryPoint>>;

const ID_MAP: Record<string, CommodityId> = {
  gold: 'gold',
  silver: 'silver',
  crude: 'crude',
};

function readStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { gold: {}, silver: {}, crude: {} };
    return JSON.parse(raw) as Store;
  } catch {
    return { gold: {}, silver: {}, crude: {} };
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    // storage quota exceeded — ignore
  }
}

function pruneStore(store: Store): Store {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const pruned: Store = { gold: {}, silver: {}, crude: {} };
  for (const cid of Object.keys(store) as CommodityId[]) {
    for (const [date, point] of Object.entries(store[cid])) {
      if (date >= cutoffStr) pruned[cid][date] = point;
    }
  }
  return pruned;
}

/** Save live spread readings into localStorage (one entry per day). */
export function saveSpreadToHistory(spreads: SpreadData[]) {
  if (typeof window === 'undefined') return;
  const store = readStore();
  let changed = false;

  for (const s of spreads) {
    const cid = ID_MAP[s.id];
    if (!cid) continue;
    if (!s.spread || !s.chinaPriceConverted || !s.intlPrice.price) continue;

    const date = new Date(s.timestamp).toISOString().slice(0, 10);
    store[cid][date] = {
      date,
      spread: s.spread,
      chinaPrice: s.chinaPriceConverted,
      intlPrice: s.intlPrice.price,
      usdCny: s.usdCnyRate,
    };
    changed = true;
  }

  if (changed) writeStore(pruneStore(store));
}

/** Load sorted history for a given commodity from localStorage. */
export function loadHistoryFromStorage(
  commodity: CommodityId,
  rangeDays: number,
): SpreadHistoryPoint[] {
  if (typeof window === 'undefined') return [];
  const store = readStore();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return Object.values(store[commodity])
    .filter((p) => p.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date));
}
