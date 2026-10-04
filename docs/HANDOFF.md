# 專案交接與最終驗收

## 專案概況

Kawan Melayu 是 Vite 靜態網站，主要遊戲可完全離線使用。資料與遊戲邏輯在 `src/`，Vitest 測試在 `tests/`，母語審閱表由 `npm run export:review` 產生。AI 預設關閉；Cloudflare Worker 為選配獨立服務。本文整理本機使用、靜態部署及代理維護事項。

## 本機執行

需求 Node.js 20+、npm。Linux Mint 詳細步驟見 [SETUP-LINUX-MINT.md](SETUP-LINUX-MINT.md)。

```bash
npm install
npm run dev
```

於 Vite 顯示的網址開啟遊戲。建置與品質檢查：

```bash
npm run lint
npm test
npm run validate:data
npm run build
```

輸出位於 `dist/`；本機預覽建置結果可執行 `npm run preview`。遊戲存檔位於玩家瀏覽器本機，清除瀏覽器資料前請先自行匯出備份。

## GitHub Pages 部署

1. 將分支推送至 GitHub，確認 `.github/workflows/` 中 Pages workflow 權限與目標分支設定符合 repository 設定。
2. 在 GitHub repository 的 **Settings → Pages** 選擇 GitHub Actions 作為建置與部署來源。
3. 推送觸發 workflow，於 **Actions** 確認建置和部署成功，並以 Pages 網址驗證載入、資源路徑及手機版。
4. Vite base path 必須配合 repository Pages URL；自訂網域需同步調整 base、DNS 與 HTTPS 設定。

## AI 代理部署

詳見 [AI-PROXY-SETUP.md](AI-PROXY-SETUP.md) 與 [proxy/README.md](../proxy/README.md)。在 Cloudflare 設定精確的 Pages Origin；只透過 `wrangler secret put` 設定 `GROQ_KEY_1` 至 `_3`，金鑰不可提交或放入前端。部署後檢查有效 Origin、錯誤 Origin、錯誤方法、限流及上游失敗路徑。基礎遊戲不依賴代理。當前前端 AI 預設 off；代理部署並不會自動把 AI 功能接入前端，啟用前必須另完成並測試 endpoint adapter。

## 未完成事項／限制

- 需要馬來文母語者逐項審閱 `malay-review.md`，產生器初始狀態均為待審閱。
- AI adapter 與 Worker 的前端整合尚未交付；不要宣稱已提供線上 AI 對話功能。
- Worker 的 IP 計數器存在 isolate 記憶體，僅為 best-effort；正式公開服務宜加 Cloudflare 全域 Rate Limiting、用量告警及帳單上限。
- 請在真實 GitHub repository 驗證 Pages workflow、base path 與公開網址；在真實 Cloudflare 帳戶驗證授權、secret、Origin 和上游 Groq 可用性。
- 遊戲存檔依玩家瀏覽器儲存政策保存；瀏覽器清除資料可能造成遺失。第三方 AI 服務的資料處理由其政策管理。

## 使用者／維運者手動事項

- 完成 Pages repository 設定及首次部署確認。
- 如使用 AI：建立 Groq key、以 Wrangler 安全輸入 secrets、部署 Worker 並檢查用量；勿將 key 傳給開發者或放進 issue。
- 決定是否實作及驗收前端代理 adapter，設定 AI 預設狀態與失敗提示。
- 安排母語者審稿，更新資料後執行 `npm run export:review` 與全套驗收。
- 定期更新 Node/npm 依賴、監看 Cloudflare/Groq 用量，並在疑似外洩時立即撤銷金鑰。
