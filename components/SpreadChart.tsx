'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import { SpreadData } from '@/lib/types';
import { saveSpreadToHistory, loadHistoryFromStorage } from '@/lib/spread-history-store';

type Range = '1w' | '1m' | '3m' | '6m' | '1y';
type Commodity = 'gold' | 'silver' | 'crude';

const RANGE_LABELS: { key: Range; label: string; days: number }[] = [
  { key: '1w', label: '7天', days: 7 },
  { key: '1m', label: '1月', days: 30 },
  { key: '3m', label: '3月', days: 90 },
  { key: '6m', label: '6月', days: 180 },
  { key: '1y', label: '1年', days: 365 },
];

const COMMODITY_LABELS: { key: Commodity; label: string; icon: string; unit: string }[] = [
  { key: 'gold', label: '黄金', icon: '🥇', unit: 'USD/troy oz' },
  { key: 'silver', label: '白银', icon: '🥈', unit: 'USD/troy oz' },
  { key: 'crude', label: '原油', icon: '🛢️', unit: 'USD/桶' },
];

function formatDate(dateStr: string, range: Range) {
  const d = new Date(dateStr + 'T00:00:00');
  if (range === '1w' || range === '1m') return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${String(d.getFullYear()).slice(2)}/${d.getMonth() + 1}/${d.getDate()}`;
}

function fmt(v: number, decimals = 2) {
  return v.toFixed(decimals);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as SpreadHistoryPoint & { label: string; spreadPct: number };
  if (!d) return null;
  const isPositive = d.spreadPct >= 0;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs shadow-xl min-w-[180px]">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      <div className={`font-bold text-sm mb-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        价差: {isPositive ? '+' : ''}{fmt(d.spreadPct)}%
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

interface Props {
  /** Live spread readings passed from page.tsx — saved to localStorage for history */
  liveData?: SpreadData[];
}

export default function SpreadChart({ liveData }: Props) {
  const [commodity, setCommodity] = useState<Commodity>('gold');
  const [range, setRange] = useState<Range>('1m');
  const [data, setData] = useState<SpreadHistoryPoint[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const savedRef = useRef(false);

  // --- Persist live spread readings to localStorage ---
  useEffect(() => {
    if (!liveData || liveData.length === 0) return;
    saveSpreadToHistory(liveData);
    savedRef.current = true;
  }, [liveData]);

  // --- Merge server data + localStorage data ---
  const loadData = useCallback(
    async (c: Commodity, r: Range) => {
      const rangeDef = RANGE_LABELS.find((x) => x.key === r)!;

      // 1. Load from localStorage immediately (no flash)
      const localData = loadHistoryFromStorage(c, rangeDef.days);
      if (localData.length > 0) setData(localData);

      // 2. Try server-side API (works when deployed in CN or with proxy)
      setServerLoading(true);
      try {
        const res = await fetch(`/api/history?commodity=${c}&range=${r}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          // Merge: server data takes precedence for its dates; local fills the rest
          const merged = new Map<string, SpreadHistoryPoint>(
            localData.map((p) => [p.date, p])
          );
          for (const p of json.data as SpreadHistoryPoint[]) {
            merged.set(p.date, p);
          }
          const sorted = [...merged.values()].sort((a, b) =>
            a.date.localeCompare(b.date)
          );
          setData(sorted);
        }
      } catch {
        // server unavailable — localStorage data already shown
      } finally {
        setServerLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData(commodity, range);
  }, [loadData, commodity, range, liveData]); // re-run when new live data arrives

  const currentCommodity = COMMODITY_LABELS.find((c) => c.key === commodity)!;
  const rangeDef = RANGE_LABELS.find((r) => r.key === range)!;

  // spreadPct = intlPrice / chinaPrice - 1 (percentage, 2dp)
  const chartData = data.map((d) => ({
    ...d,
    spreadPct: d.chinaPrice > 0 ? +((d.intlPrice / d.chinaPrice - 1) * 100).toFixed(2) : 0,
    label: formatDate(d.date, range),
  }));

  const pcts = chartData.map((d) => d.spreadPct);
  const minPct = pcts.length ? Math.min(...pcts, 0) : -1;
  const maxPct = pcts.length ? Math.max(...pcts, 0) : 1;
  const pad = ((maxPct - minPct) * 0.2) || Math.abs(maxPct) * 0.2 || 0.5;
  const yDomain = [+(minPct - pad).toFixed(2), +(maxPct + pad).toFixed(2)];

  const lastPoint = data[data.length - 1];
  const isBuilding = data.length > 0 && data.length < 5;

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white">历史价差走势</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentCommodity.icon} {currentCommodity.label} · 国际价/国内换算价−1（%）
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
      {data.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          {[
            {
              label: '最新价差',
              value: pcts.length ? (pcts[pcts.length - 1] >= 0 ? '+' : '') + fmt(pcts[pcts.length - 1]) + '%' : '-',
              color: (pcts[pcts.length - 1] ?? 0) >= 0 ? 'text-green-400' : 'text-red-400',
            },
            {
              label: '期间最高',
              value: '+' + fmt(Math.max(...pcts)) + '%',
              color: 'text-green-400',
            },
            {
              label: '期间最低',
              value: fmt(Math.min(...pcts)) + '%',
              color: Math.min(...pcts) < 0 ? 'text-red-400' : 'text-green-400',
            },
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
      <div className="relative min-h-[200px]">
        {serverLoading && data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              加载历史数据...
            </div>
          </div>
        )}

        {!serverLoading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
            <p className="text-gray-400 text-sm font-medium">暂无 {rangeDef.label} 历史数据</p>
            <p className="text-gray-600 text-xs max-w-xs">
              历史价差将随每次页面刷新自动累积到本地。每 30 秒记录一次，
              数据将持续保存在浏览器中。
            </p>
          </div>
        )}

        {isBuilding && (
          <div className="mb-3 px-3 py-2 bg-blue-900/30 border border-blue-700/30 rounded-lg text-xs text-blue-300">
            数据积累中（{data.length} 天）· 页面保持开启可持续累积历史记录
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
                tickFormatter={(v) => v.toFixed(2) + '%'}
                width={58}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#4b5563', strokeWidth: 1 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }}
                formatter={(value) =>
                  value === 'spreadPct' ? '价差 % (国际/国内换算−1)' : value
                }
              />
              <ReferenceLine
                y={0}
                stroke="#6b7280"
                strokeDasharray="4 2"
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey="spreadPct"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={data.length <= 30 ? { r: 3, fill: '#60a5fa' } : false}
                activeDot={{ r: 4, fill: '#60a5fa' }}
                isAnimationActive={false}
              />
              {data.length > 3 && (
                <Brush
                  dataKey="label"
                  height={24}
                  stroke="#374151"
                  fill="#1f2937"
                  travellerWidth={8}
                  startIndex={Math.max(0, chartData.length - Math.min(chartData.length, 60))}
                >
                  <LineChart>
                    <Line
                      type="monotone"
                      dataKey="spreadPct"
                      stroke="#3b82f6"
                      dot={false}
                      strokeWidth={1}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </Brush>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-3">
        数据存储于浏览器本地 · 可拖动底部滑块缩放时间范围
        {serverLoading && <span className="text-gray-700 ml-2">正在尝试加载服务端历史...</span>}
      </p>
    </div>
  );
}
