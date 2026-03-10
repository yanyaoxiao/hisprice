'use client';

import { SpreadData } from '@/lib/types';

interface SummaryBarProps {
  spreads: SpreadData[];
}

export default function SummaryBar({ spreads }: SummaryBarProps) {
  if (spreads.length === 0) return null;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
      <div className="grid grid-cols-3 divide-x divide-gray-700">
        {spreads.map((s) => (
          <div key={s.id} className="px-4 text-center first:pl-0 last:pr-0">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="text-base">{s.icon}</span>
              <span className="text-xs text-gray-400">{s.name}</span>
            </div>
            <div
              className={`text-lg font-bold ${
                s.spreadPercent > 0 ? 'text-green-400' : s.spreadPercent < 0 ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {s.spreadPercent > 0 ? '+' : ''}{s.spreadPercent.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
