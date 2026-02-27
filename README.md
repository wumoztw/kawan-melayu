# Kawan Melayu (馬來文夥伴)

這是一個「情境式馬來文學習文字冒險遊戲」。

目前提供兩種模式：

1) **純前端模式（GitHub Pages）**：不需要後端，可直接在瀏覽器輸入你的 API Key 使用。
2) **FastAPI 後端模式（推薦）**：由後端負責呼叫 LLM、解析 action、回傳乾淨 UI 文本，避免 action/程式碼外洩，並更容易擴充。

---

## FastAPI 後端模式（推薦）

### 1. 安裝

需要 Python 3.10+。

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r backend/requirements.txt
```

### 2. 啟動

```bash
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

打開：
- http://localhost:8000 （前端 UI）
- http://localhost:8000/docs （API 文件）

### 3. 環境變數（後端代管 Key，建議）

你也可以用前端傳入的 key（不推薦），但最穩的方式是後端用環境變數代管。

支援：
- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

---

## 純前端模式（GitHub Pages）

如要部署到 GitHub Pages：
1. 將 `index.html`、`style.css`、`game.js` 上傳至該 Repository。
2. 進入 Repository 的 **Settings** -> **Pages**。
3. Source 選擇 `Deploy from a branch`。
4. Branch 選擇 `main`。

> 注意：GitHub Pages 不能執行 FastAPI，你需要另外部署後端（例如 Zeabur / Render / Fly.io / Railway）。
