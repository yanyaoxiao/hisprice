# 期货价差 · HisPrice

实时对比中国期货与国际期货的价差，统一换算为相同货币单位后进行价差分析。

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/hisprice)

## 支持品种

| 品种 | 国内 | 国际 | 换算单位 |
|------|------|------|---------|
| 🥇 黄金 | 沪金 AU0（CNY/克） | COMEX GC=F（USD/troy oz） | × 31.1035 ÷ 汇率 |
| 🥈 白银 | 沪银 AG0（CNY/千克） | COMEX SI=F（USD/troy oz） | ÷ 汇率 ÷ 32.1507 |
| 🛢️ 原油 | SC原油 SC0（CNY/桶） | WTI CL=F（USD/桶） | ÷ 汇率 |

- **价差** = 国际价格 − 国内换算价格
- 正值（升水）：国际价格高于国内
- 负值（贴水）：国内价格高于国际

## 数据来源

- **国内期货**：东方财富行情 API（AU0 / AG0 / SC0 主力合约）
- **国际期货**：Yahoo Finance（GC=F / SI=F / CL=F）
- **汇率 USD/CNY**：Yahoo Finance（USDCNY=X）
- **刷新频率**：每 30 秒自动更新

## 本地运行

```bash
git clone <repo-url>
cd hisprice
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 部署到 Railway

### 方式一：一键部署（推荐）

1. 点击上方 **Deploy on Railway** 按钮
2. 登录 Railway 账号
3. 点击 **Deploy** 即可，无需配置任何环境变量

### 方式二：从 GitHub 仓库部署

1. 将本项目 Fork 或 Push 到你的 GitHub 仓库
2. 打开 [railway.com](https://railway.com) → New Project → Deploy from GitHub repo
3. 选择对应仓库，Railway 会自动检测 Next.js 并完成部署

### 方式三：使用 Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Railway 会自动识别 Next.js 项目，无需额外配置。

## 技术栈

- **框架**：[Next.js 15](https://nextjs.org/)（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **部署**：Railway

## 免责声明

本站数据仅供学习参考，不构成投资建议。期货交易有风险，投资需谨慎。
