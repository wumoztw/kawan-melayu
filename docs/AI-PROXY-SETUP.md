# Cloudflare Worker AI 代理部署

AI 是選用功能；基礎遊戲不需代理或金鑰。代理程式位於 `proxy/worker.js`，只接受指定前端 Origin 的 `POST /chat`，固定模型，只轉送 `messages`，並限制訊息及頻率。設定三把 Groq 金鑰可於暫時失敗時依序重試。不可將任何金鑰寫入設定檔、前端或 Git。

## 1. 準備前端 Origin

確認 GitHub Pages 網站的瀏覽器 Origin（只有 scheme、主機及必要 port，不含路徑）。例如使用者／組織 Pages 是 `https://ACCOUNT.github.io`；若站點在自訂網域則使用該網域。代理部署後只能接受精確相符 Origin。

## 2. 安裝 Wrangler 與登入

需要 Node.js 20+、npm 及 Cloudflare 帳號。於專案根目錄執行：

```bash
npm install --global wrangler
wrangler --version
wrangler login
```

在瀏覽器完成 Cloudflare 授權，回到終端機確認登入成功。

## 3. 設定公開變數及安全 secrets

編輯 `proxy/wrangler.toml` 的 `ALLOWED_ORIGIN`，改為上一步的精確 Origin（不要加尾斜線）。確認檔案中沒有任何金鑰。於專案根目錄逐一執行，依提示安全貼上 Groq API 金鑰：

```bash
cd proxy
wrangler secret put GROQ_KEY_1
wrangler secret put GROQ_KEY_2
wrangler secret put GROQ_KEY_3
```

至少設定一把；未設定的槽位不會被使用。secret 由 Cloudflare 管理，不會回寫本機設定檔。不要把終端機輸入寫進 shell history 或共享紀錄。

## 4. 部署並驗證

```bash
wrangler deploy
```

記下 Wrangler 回報的 Worker URL（例如 `https://kawan-melayu-ai-proxy.<帳號>.workers.dev`），以允許的前端網站測試 AI 功能。非允許 Origin、錯誤路徑／方法應被拒絕。不要在驗收時把 key 放進 URL、程式碼或截圖。查看 Cloudflare 使用量與帳單並設定適當限額；Worker 的 isolate 記憶體限流是 best-effort，不能取代 Cloudflare 全域 Rate Limiting 規則。

## 5. 前端連接與注意事項

將部署 URL 設定至應用程式使用的 AI endpoint，並確認用戶端呼叫代理的 `/chat` 契約；目前前端 AI 預設關閉且不會自行部署或設定代理。若需產品化串接，請先實作並測試相容的代理 adapter，再公開啟用。代理僅輸出受限錯誤，不保存玩家內容，但 Groq 仍是第三方服務。輪替 key 不是帳號級速率限制或故障切換 SLA。

撤銷金鑰請至 Groq 管理介面操作，並重新執行相應 `wrangler secret put` 更新。部署前可用 `wrangler deploy --dry-run` 檢查打包結果。
