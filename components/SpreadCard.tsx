'use client';

import { SpreadData } from '@/lib/types';

interface SpreadCardProps {
  spread: SpreadData;
}

function PriceChange({ value, percent }: { value: number; percent: number }) {
  const isPositive = value >= 0;
  return (
    <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      {isPositive ? '+' : ''}{value.toFixed(2)} ({isPositive ? '+' : ''}{percent.toFixed(2)}%)
    </span>
  );
}

function SpreadBadge({ spread, percent }: { spread: number; percent: number }) {
  const isPositive = spread >= 0;
  const absPercent = Math.abs(percent);

  let bgColor = 'bg-gray-700';
  if (absPercent > 2) bgColor = isPositive ? 'bg-green-900/60 border border-green-500/30' : 'bg-red-900/60 border border-red-500/30';
  else if (absPercent > 0.5) bgColor = isPositive ? 'bg-green-900/40' : 'bg-red-900/40';

  return (
    <div className={`rounded-lg px-4 py-2 text-center ${bgColor}`}>
      <div className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{spread.toFixed(2)}
      </div>
      <div className={`text-sm mt-0.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? '+' : ''}{percent.toFixed(2)}%
      </div>
    </div>
  );
}

export default function SpreadCard({ spread }: SpreadCardProps) {
  const { chinaPrice, intlPrice, chinaPriceConverted, usdCnyRate } = spread;
  const isMarketOpen = chinaPrice.price > 0 && intlPrice.price > 0;

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{spread.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-white">{spread.name}</h2>
            <p className="text-xs text-gray-400">{spread.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">价差 ({spread.displayUnit})</div>
          <SpreadBadge spread={spread.spread} percent={spread.spreadPercent} />
        </div>
      </div>

      {/* Price comparison table */}
      <div className="space-y-3">
        {/* China futures */}
        <div className="bg-gray-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded">
                🇨🇳 {chinaPrice.exchange}
              </span>
              <span className="ml-2 text-sm font-semibold text-gray-200">{chinaPrice.name}</span>
            </div>
            {isMarketOpen && <PriceChange value={chinaPrice.change} percent={chinaPrice.changePercent} />}
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">
              {chinaPrice.price > 0 ? chinaPrice.price.toFixed(2) : '--'}
            </span>
            <span className="text-xs text-gray-400 mb-1">{chinaPrice.unit}</span>
          </div>
          {/* Converted price */}
          {chinaPriceConverted > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <span className="text-xs text-gray-500">换算后: </span>
              <span className="text-sm font-medium text-yellow-400">
                {chinaPriceConverted.toFixed(2)} {spread.displayUnit}
              </span>
              <span className="text-xs text-gray-500 ml-2">(汇率: {usdCnyRate.toFixed(4)})</span>
            </div>
          )}
        </div>

        {/* Spread arrow */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-px w-16 bg-gray-600"></div>
            <span className="text-xs">价差对比</span>
            <div className="h-px w-16 bg-gray-600"></div>
          </div>
        </div>

        {/* International futures */}
        <div className="bg-gray-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-medium text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                🌐 {intlPrice.exchange}
              </span>
              <span className="ml-2 text-sm font-semibold text-gray-200">{intlPrice.name}</span>
            </div>
            {isMarketOpen && <PriceChange value={intlPrice.change} percent={intlPrice.changePercent} />}
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">
              {intlPrice.price > 0 ? intlPrice.price.toFixed(2) : '--'}
            </span>
            <span className="text-xs text-gray-400 mb-1">{intlPrice.unit}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      {!isMarketOpen && (
        <div className="mt-4 text-center text-xs text-gray-500 bg-gray-900/40 rounded-lg py-2">
          数据加载中或市场休市...
        </div>
      )}
    </div>
  );
}
