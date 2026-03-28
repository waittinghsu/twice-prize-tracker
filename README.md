# twice-prize-tracker

TWICE fanpla 抽獎追蹤器。每 10 分鐘爬 https://chance.fanpla.jp/twice/471，偵測獎項數量減少時記錄到 Notion。

## 設定 x

```bash
cp .env.example .env
# 填入 NOTION_TOKEN
```

## 執行

```bash
npm install
node scraper.js
```

## Notion DB IDs

- Prize State DB: `3302eba4-ebd4-817d-8b93-e0c679891d7d`
- Draw Log DB: `3302eba4-ebd4-8129-8df2-c986bfc24786`

## 活動期間

2026/4/28 結束，腳本超過日期後自動退出。
