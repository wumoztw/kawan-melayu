# Spec: 依序實作三項增強功能 (1. 音效反饋 2. 離線 PWA 3. 匯出 Anki 學習卡片)

## 1. 任務目標
在維持目前定案的版面、配色（純淨白+淺藍）、大紅花 Icon 與 20 個等級 400 題的前提下，依序實作：
1. **答對音效反饋 (Web Audio API)**：答對時播放清脆悅耳的「叮咚」音效（純合成，無外部音檔檔案依賴，零網路延遲）。
2. **支援離線 PWA (Progressive Web App)**：支援「新增至主畫面」如同原生 App，離線可用（加入 `manifest.webmanifest` 與 `service worker` 或 vite-plugin-pwa）。
3. **匯出 Anki 學習卡片 (Export to Anki)**：在頂部選單提供「匯出 Anki 卡片 (.txt / .csv)」按鈕，一鍵下載包含 400 句例句與詞彙的標準 Anki 格式。

## 2. 功能細節規劃

### 功能 1：答對音效 (Web Audio API)
- 建立 `src/ui/audio.js`：
  - 使用 `window.AudioContext` 或 `window.webkitAudioContext`。
  - 答對時播放優雅的雙音和弦（例如 C6 到 G6，頻率 1046Hz -> 1568Hz 的短促柔和鈴聲，duration ~ 0.2s，使用 gainNode 指數淡出，音量適中柔和）。
  - 若使用者瀏覽器限制或靜音，自動優雅降級不報錯。

### 功能 2：離線 PWA 支援
- 建立 `public/manifest.webmanifest`（或 `public/manifest.json`）：
  - name: "馬來語語言積木 - Kawan Melayu"
  - short_name: "馬來語積木"
  - start_url: "/kawan-melayu/"
  - scope: "/kawan-melayu/"
  - display: "standalone"
  - background_color: "#ffffff"
  - theme_color: "#f0f7ff"
  - icons: 包含 192x192 與 512x512 的大紅花向量圖標。
- 建立 `public/sw.js`（或透過 Vite build 註冊 service worker 快取核心 asset）：
  - 在 `src/main.js` 中註冊 service worker。
- 在 `index.html` 加入 `<link rel="manifest" href="/kawan-melayu/manifest.webmanifest">` 與 `<meta name="theme-color" content="#f0f7ff">`。

### 功能 3：匯出 Anki 學習卡片
- 在 `src/engine/scaffolding-engine.js` 增加 `exportAnkiCards(data)`：
  - 輸出 UTF-8 編碼的 CSV/TSV 格式（正面：馬來語，背面：繁體中文，標籤 Tags：Level-X 與單元標題）。
  - 同時包含 400 句階梯例句與 glossary 中的所有單字。
- 在頂部折疊選單下方（或操作列）新增一個「匯出 Anki 卡片」按鈕。
- 點擊後以 Blob 自動觸發瀏覽器下載 `kawan-melayu-anki.txt`。

## 3. 驗收標準
- `npm test` 通過。
- `npm run lint` 通過。
- `npm run build` 通過。
- 答對題目時有悅耳叮咚音效。
- 支援 PWA 安裝。
- 點擊匯出按鈕能正確下載完整的 Anki 卡片檔案。
