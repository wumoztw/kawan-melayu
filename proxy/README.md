# Cloudflare AI 代理

Worker 僅提供 `POST /chat`（瀏覽器跨域預檢使用 `OPTIONS /chat`），嚴格比對 `Origin` 與 `ALLOWED_ORIGIN`，固定 Groq 模型及轉送欄位，限制訊息格式、大小、每個 IP 每分鐘 20 次；最多依序嘗試三組 Groq secret。請求內容與上游回應不寫入日誌，回傳錯誤不包含金鑰或上游內容。Worker isolate 記憶體中的頻率限制屬 best-effort，不等同全域持久限流。

部署與 secret 設定請依照 [`../docs/AI-PROXY-SETUP.md`](../docs/AI-PROXY-SETUP.md)。`ALLOWED_ORIGIN` 必須設定為前端實際 Origin（例如 `https://帳號.github.io`）；不可含路徑或尾斜線。金鑰只用 `wrangler secret put` 輸入，絕不寫入此目錄或版本庫。
