'use client';

export default function ConversionInfo() {
  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 mt-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        换算说明
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-400">
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-yellow-400 font-medium mb-1">🥇 黄金换算</div>
          <div className="space-y-0.5">
            <div>沪金报价: CNY / 克</div>
            <div>COMEX报价: USD / 金衡盎司</div>
            <div className="text-gray-500">1金衡盎司 = 31.1035 克</div>
            <div className="text-yellow-400/80 mt-1">
              换算 = 沪金价 × 31.1035 ÷ 汇率
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-gray-300 font-medium mb-1">🥈 白银换算</div>
          <div className="space-y-0.5">
            <div>沪银报价: CNY / 千克</div>
            <div>COMEX报价: USD / 金衡盎司</div>
            <div className="text-gray-500">1千克 ≈ 32.1507 金衡盎司</div>
            <div className="text-yellow-400/80 mt-1">
              换算 = 沪银价 ÷ 汇率 ÷ 32.1507
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-blue-400 font-medium mb-1">🛢️ 原油换算</div>
          <div className="space-y-0.5">
            <div>SC原油报价: CNY / 桶</div>
            <div>WTI报价: USD / 桶</div>
            <div className="text-gray-500">单位相同，仅需换算货币</div>
            <div className="text-yellow-400/80 mt-1">
              换算 = SC原油价 ÷ 汇率
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-3">
        * 价差 = 国际价格 - 国内换算价格。正值表示国际价格高于国内（升水），负值表示国内价格高于国际（贴水）。
      </p>
    </div>
  );
}
