'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Brush,
  Legend,
} from 'recharts';
import { SpreadHistoryPoint } from '@/lib/history-fetchers';

type Range = '1w' | '1m' | '3m' | '6m' | '1y';
type Commodity = 'gold' | 'silver' | 'crude';

const RANGE_LABELS: { key: Range; label: string }[] = [
  { key: '1w', label: '7天' },
  { key: '1m', label: '1月' },
  { key: '3m', label: '3月' },
  { key: '6m', label: '6月' },
  { key: '1y', label: '1年' },
];

const COMMODITY_LABELS: { key: Commodity; label: string; icon: string; unit: string }[] = [
  { key: 'gold', label: '黄金', icon: '🥇', unit: 'USD/troy oz' },
  { key: 'silver', label: '白银', icon: '🥈', unit: 'USD/troy oz' },
  { key: 'crude', label: '原油', icon: '🛢️', unit: 'USD/桶' },
];

function formatDate(dateStr: string, range: Range) {
  const d = new Date(dateStr);
  if (range === '1w') return `${d.getMonth() + 1}/${d.getDate()}`;
  if (range === '1m') return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${d.getFullYear().toString().slice(2)}/${d.getMonth() + 1}/${d.getDate()}`;
}

function fmt(v: number, decimals = 2) {
  return v.toFixed(decimals);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as SpreadHistoryPoint;
  if (!d) return null;

  const isPositive = d.spread >= 0;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs shadow-xl min-w-[180px]">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      <div className={`font-bold text-sm mb-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        价差: {isPositive ? '+' : ''}{fmt(d.spread)} {unit}
      </div>
      <div className="space-y-0.5 text-gray-300">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">国际</span>
          <span>{fmt(d.intlPrice)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">国内(换算)</span>
          <span>{fmt(d.chinaPrice)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">USD/CNY</span>
          <span>{fmt(d.usdCny, 4)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SpreadChart() {
  const [commodity, setCommodity] = useState<Commodity>('gold');
  const [range, setRange] = useState<Range>('1m');
  const [data, setData] = useState<SpreadHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (c: Commodity, r: Range) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?commodity=${c}&range=${r}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setData(json.data);
      } else if (json.data.length === 0) {
        setData([]);
        setError('暂无历史数据');
      } else {
        setError(json.error ?? '数据获取失败');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(commodity, range);
  }, [fetchData, commodity, range]);

  const currentCommodity = COMMODITY_LABELS.find((c) => c.key === commodity)!;

  // Chart data with formatted labels
  const chartData = data.map((d) => ({
    ...d,
    label: formatDate(d.date, range),
  }));

  // Y-axis domain with 20% padding
  const spreads = data.map((d) => d.spread);
  const minSpread = Math.min(...spreads, 0);
  const maxSpread = Math.max(...spreads, 0);
  const pad = (maxSpread - minSpread) * 0.2 || Math.abs(maxSpread) * 0.2 || 1;
  const yDomain = [+(minSpread - pad).toFixed(2), +(maxSpread + pad).toFixed(2)];

  const lastPoint = data[data.length - 1];

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white">历史价差走势</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentCommodity.icon} {currentCommodity.label} · 单位: {currentCommodity.unit} ·
            国际价 − 国内换算价
          </p>
        </div>

        {/* Commodity tabs */}
        <div className="flex gap-1 bg-gray-900/60 rounded-lg p-1 self-start">
          {COMMODITY_LABELS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCommodity(c.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                commodity === c.key
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Range selector */}
      <div className="flex gap-1 mb-4">
        {RANGE_LABELS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              range === r.key
                ? 'bg-gray-600 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      {data.length > 0 && !loading && (
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          {[
            { label: '最新价差', value: lastPoint ? (lastPoint.spread >= 0 ? '+' : '') + fmt(lastPoint.spread) : '-', color: lastPoint?.spread >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: '期间最高', value: '+' + fmt(Math.max(...spreads)), color: 'text-green-400' },
            { label: '期间最低', value: fmt(Math.min(...spreads)), color: Math.min(...spreads) < 0 ? 'text-red-400' : 'text-green-400' },
            { label: '数据点', value: `${data.length}天`, color: 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="text-gray-500">{s.label}</span>
              <span className={`font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart area */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-xl z-10">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              加载历史数据...
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            {error}
          </div>
        )}

        {!error && !loading && data.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            暂无数据
          </div>
        )}

        {data.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={yDomain}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toFixed(1)}
                width={52}
              />
              <Tooltip
                content={<CustomTooltip unit={currentCommodity.unit} />}
                cursor={{ stroke: '#4b5563', strokeWidth: 1 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }}
                formatter={(value) =>
                  value === 'spread' ? '价差 (国际−国内换算)' : value
                }
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" strokeWidth={1} />
              <Line
                type="monotone"
                dataKey="spread"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#60a5fa' }}
                isAnimationActive={false}
              />
              {/* Brush for drag-to-zoom */}
              <Brush
                dataKey="label"
                height={24}
                stroke="#374151"
                fill="#1f2937"
                travellerWidth={8}
                startIndex={Math.max(0, chartData.length - Math.min(chartData.length, 60))}
              >
                <LineChart>
                  <Line type="monotone" dataKey="spread" stroke="#3b82f6" dot={false} strokeWidth={1} />
                </LineChart>
              </Brush>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-3">
        数据来源: 东方财富(国内历史K线) · Yahoo Finance(国际期货 + 汇率) · 可拖动底部滑块缩放
      </p>
    </div>
  );
}
