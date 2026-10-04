# Kawan Melayu（馬來文夥伴）

純前端（HTML/CSS/JS）打造的「情境式馬來文學習文字冒險」網站：你在瀏覽器輸入一句話，AI 會用馬來西亞在地情境帶你闖關、給你可直接照念的句子、並以任務系統推進學習。

> 特色：無後端、可直接部署到 GitHub Pages；API Key 只保存在你的瀏覽器 LocalStorage（除非你選擇存檔時把 Key 一起打包）。

---

## 快速開始（使用者）

1. 打開網站右上角 ⚙️ 設定。
2. 選擇 Provider（OpenRouter / Groq / Gemini / OpenAI）。
3. 貼上對應供應商的 API Key（你也可以把多家 Key 都填好，並開啟「自動備援」）。
4. 回到聊天框，先輸入：`你好` 開始第一個任務。

操作提示：
- Enter 送出、Shift+Enter（若瀏覽器支援輸入框換行則可用）。
- Stop 可中止請求（AbortController）。
- Retry 會重送上一句使用者訊息。
- 「＋ 新對話 / Clear」會清空聊天並重新開始任務。

---

## 核心玩法與回覆格式

AI 每回合會固定輸出四段（顯示給使用者）：
1. **場景**：1–2 句現場描寫（聲音、氣味、動作）。
2. **角色**：以店員/攤販/服務生等口吻直接跟你說話。
3. **你可以說**：給你 1 句可直接照念的馬來文。
4. **新詞**：最多 1–2 個單字／片語（馬來文 + 繁中解釋）。

同時 AI 會在訊息最後附上一行 `<action>{...}</action>`（不顯示給使用者），用來讓程式更新狀態（信心、流利度、等級、地點、任務、單字）。

---

## 等級、場景、任務系統

### 等級（Level）
- Lv.1–3：台灣華語為主、馬來文為輔（約 70%：30%）。
- Lv.4–6：馬來文為主、台灣華語為輔（約 70%：30%）。
- Lv.7+：幾乎全馬來文（約 90–100%）。

### 場景（Scenes）
內建多個場景，會依等級解鎖，例如：嘛嘛檔、路邊小攤、商店、餐廳、夜市等。

### 任務（Mission）
- 系統必須維持一個任務（title/objective/step/total/status）。
- 任務完成（status=completed）後會自動建立新任務。
- 只有在任務完成且等級達標時，才會更換地點（location）。

---

## 介面與捲動行為

- 桌機：頁面本身不捲動，永遠只在聊天框（`.chat-stream` / `#mudChatBox`）內捲動；自動捲動也只操作聊天框，避免「整頁被推走」造成視覺跳動。
- 手機：同樣採「聊天框單一捲動容器」策略，並避免與觸控滑動互相打架（程式會偵測使用者是否正在觸碰/拖曳聊天區）。

---

## Provider 與模型

專案支援多家供應商（皆由前端直接呼叫）：
- OpenRouter（預設；並提供 `auto` 選項）。
- Groq。
- Google Gemini（使用原生 generateContent API 格式）。
- OpenAI（Chat Completions 介面）。

### 自動備援（Fallback）
勾選「自動備援」後，若主要供應商遇到 429/5xx，會依序切換到其他供應商重試（並內建少量重試與退避）。

---

## 存檔 / 讀檔（Save / Load）

- Save：下載 JSON，包含 gameState、最近的對話紀錄、以及設定（Provider/Model/Fallback）。
- Load：讀回 JSON 並還原 UI 與狀態。
- 「存檔包含 API Key」：若勾選，存檔 JSON 會把目前輸入的 Key 也寫入檔案；若要分享存檔，請務必取消勾選。

---

## 專案架構（Repository Structure）

本專案為靜態站點，主要檔案如下：

- `index.html`：畫面骨架（Header / Sidebar / Chat / Composer）、外部字型與 marked.js 引入、以及載入 `game.js`。
- `style.css`：整體視覺主題與響應式版型（桌機/手機），包含「聊天框單一捲動容器」佈局策略。
- `game.js`：所有核心邏輯（狀態管理、任務/場景、訊息渲染、Provider 呼叫、fallback、存檔讀檔、捲動策略）。
- `README.md`：你正在看的這份說明文件。

### 前端狀態（gameState）
主要狀態包含：`confidence`、`fluency`、`level`、`location`、`vocabulary[]`、`mission{...}`。

### 對話歷史（messageHistory）
- 會保留 system prompt + 最近數回合對話，送往模型時用來維持上下文。
- 內含 prune 機制，避免對話過長造成成本上升或超過限制。

---

## 部署到 GitHub Pages

1. 在 GitHub 建立 Repository（例如 `kawan-melayu`）。
2. 上傳 `index.html`、`style.css`、`game.js`、`README.md` 到 main 分支。
3. 到 Settings → Pages → Source 選 `Deploy from a branch`，Branch 選 `main` 後 Save。
4. 等 1–2 分鐘即可取得 GitHub Pages 網址。

---

## 開發者備註

- 這個專案沒有後端，API Key 只會在瀏覽器端使用；請自行評估公開部署的風險（例如不要把真實 Key 寫死在檔案裡）。
- 若你更新了 `style.css` 或 `game.js`，建議同步更新 `index.html` 內的 query string（`?v=...`）以避免快取造成「已部署但看不到變更」。

---

## 版本紀錄

- 2026-03-01：桌機改為永遠只在聊天框內捲動（鎖住頁面滾動），手機維持不變。
