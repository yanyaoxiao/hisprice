'use client';

import { useEffect, useState, useCallback } from 'react';
import { SpreadData } from '@/lib/types';
import SpreadCard from '@/components/SpreadCard';
import Header from '@/components/Header';
import SummaryBar from '@/components/SummaryBar';
import ConversionInfo from '@/components/ConversionInfo';
import SpreadChart from '@/components/SpreadChart';

const REFRESH_INTERVAL = 30 * 1000; // 30 seconds

export default function Home() {
  const [spreads, setSpreads] = useState<SpreadData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usdCnyRate, setUsdCnyRate] = useState<number | undefined>();
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  const fetchSpreads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prices/spread');
      const json = await res.json();
      if (json.success) {
        setSpreads(json.data);
        setUsdCnyRate(json.usdCnyRate);
        setLastUpdated(new Date());
        setCountdown(REFRESH_INTERVAL / 1000);
      } else {
        setError(json.error ?? '数据获取失败');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSpreads();
  }, [fetchSpreads]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchSpreads, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchSpreads]);

  // Countdown timer
  useEffect(() => {
    if (isLoading) return;
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoading]);

  return (
    <div className="min-h-screen">
      <Header
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        usdCnyRate={usdCnyRate}
        onRefresh={fetchSpreads}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Subtitle */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">中外期货价差实时对比</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                统一换算为相同货币单位和计量单位后的价差分析
              </p>
            </div>
            {!isLoading && countdown > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>{countdown}s 后刷新</span>
              </div>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 mb-6 text-sm text-red-300">
            <strong>错误:</strong> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && spreads.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 animate-pulse">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-gray-700 rounded-lg"></div>
                  <div>
                    <div className="h-4 bg-gray-700 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded w-32"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-24 bg-gray-900/60 rounded-xl"></div>
                  <div className="h-24 bg-gray-900/60 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary bar */}
        {spreads.length > 0 && <SummaryBar spreads={spreads} />}

        {/* Spread cards */}
        {spreads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {spreads.map((spread) => (
              <SpreadCard key={spread.id} spread={spread} />
            ))}
          </div>
        )}

        {/* Historical spread chart */}
        <SpreadChart liveData={spreads} />

        {/* Conversion info */}
        <ConversionInfo />

        {/* Footer */}
        <footer className="mt-8 pb-6 text-center text-xs text-gray-600">
          <p>数据来源: 东方财富 (中国期货) · Yahoo Finance (国际期货与汇率)</p>
          <p className="mt-1">本站仅供学习参考，不构成投资建议。期货交易有风险，投资需谨慎。</p>
        </footer>
      </main>
    </div>
  );
}
