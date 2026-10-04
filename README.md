# Kawan Melayu

以馬來西亞便利商店為情境的繁體中文／馬來文學習遊戲。從初階逐步練習接待顧客、商品、訂貨、節慶與日常對話，經營商店並完成每日挑戰及階段測驗。

## 遊玩方式

開啟遊戲後建立或載入存檔，依每日指示管理商品與商店、閱讀對話並選擇或輸入馬來文回答。使用字彙本複習詞語，逐步完成第 1 至 30 天及階段測驗；AI 為選用輔助，關閉或無法連線時仍可遊玩，內建規則與預設內容會接手。

## 離線與隱私

遊戲核心、劇情、資料與介面皆在瀏覽器執行，不需帳號或網路即可使用（首次載入網站除外）。進度存於本機瀏覽器；匯入匯出的存檔由玩家自行保管。上傳存檔／資料不會由本專案伺服器接收或儲存。選擇啟用 AI 時，玩家當次對話會傳送至自架 Cloudflare Worker，再轉送 Groq；請勿輸入個人或敏感資料。代理不記錄玩家內容；第三方服務仍依其自身政策處理請求。不要將 API 金鑰放入前端、存檔、Git 或公開設定。

## 開發

需求：Node.js 20+ 與 npm。Linux Mint 安裝步驟見 [環境設定](docs/SETUP-LINUX-MINT.md)。

```bash
npm install
npm run dev
```

驗收指令：

```bash
npm run lint && npm test && npm run validate:data && npm run build
```

## 部署

GitHub Pages 部署流程由 `.github/workflows/` 自動化；將專案推送至 GitHub 並啟用 Pages 的 Actions 部署來源。自訂網域／子路徑請同步檢查 `vite.config.js` 的 base。AI 代理是選配，部署方式見 [AI 代理設定](docs/AI-PROXY-SETUP.md)。

## 文件

- [Linux Mint 開發環境](docs/SETUP-LINUX-MINT.md)
- [AI 代理部署](docs/AI-PROXY-SETUP.md)
- [交接文件](docs/HANDOFF.md)
- [馬來文母語審閱表](docs/malay-review.md)
- [決策紀錄](docs/DECISIONS.md)／[進度](docs/PROGRESS.md)
