import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '期货价差 | 中外期货实时价差对比',
  description: '实时对比中国期货与国际期货的价差，包括黄金、白银、原油等品种，统一货币单位换算',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#0f1117] text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
