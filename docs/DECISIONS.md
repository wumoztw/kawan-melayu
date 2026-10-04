# 決策紀錄

## M0–M7

- 使用 Vite 建置，部署基底路徑為 `/kawan-melayu/`；以 Vitest/jsdom 與 ESLint 9 驗證。
- 核心採瀏覽器本機執行，AI 預設關閉，離線及規則回退為主要體驗。
- 遊戲資料使用 JSON 並提供驗證與母語審閱表產生器；存檔留在使用者瀏覽器。

## M8

- AI 金鑰僅存 Cloudflare Worker secret，不進入瀏覽器、版本控制或 wrangler 設定檔。
- Worker 固定 Groq endpoint/model 及轉送 schema、限制訊息與 body 大小、檢查精確 Origin，並對三把 secret 依序嘗試；失敗採不含上游細節的回應。
- Origin 驗證不是身份驗證，記憶體 IP 限流僅 best-effort；公開服務應配置 Cloudflare 全域限流與用量管控。
- AI 代理為選配，前端 AI 預設 off；部署 Worker 不代表已完成前端 endpoint adapter 整合。
