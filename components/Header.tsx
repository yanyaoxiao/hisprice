'use client';

interface HeaderProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  usdCnyRate?: number;
  onRefresh: () => void;
}

export default function Header({ lastUpdated, isLoading, usdCnyRate, onRefresh }: HeaderProps) {
  return (
    <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-sm font-bold">
              期
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">期货价差</h1>
              <p className="text-xs text-gray-400">中外期货价差对比</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {usdCnyRate && (
              <div className="hidden sm:flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-400">USD/CNY</span>
                <span className="text-sm font-semibold text-yellow-400">{usdCnyRate.toFixed(4)}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="hidden sm:block text-xs text-gray-500">
                  更新: {lastUpdated.toLocaleTimeString('zh-CN')}
                </span>
              )}
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isLoading ? '加载中' : '刷新'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
