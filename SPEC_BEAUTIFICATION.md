# Spec: 畫面視覺美化（純淨白 + 淺藍色大背景，右下角可愛版雙子星塔）

## 1. 任務目標
保留目前的所有功能架構、折疊選單與 400 題學習內容（嚴禁改動業務邏輯與流程！）。
專注於視覺美化提升質感：
1. **大背景色彩升級**：純淨白色結合柔和淡雅的淺藍色（Pure White + Soft Sky Blue / Pastel Light Blue），呈現現代、乾淨、清爽的呼吸感。
2. **吉隆坡雙子星塔 (Petronas Twin Towers) 可愛版插圖**：在畫面右下角固定放置一個極具童趣/萌系風格的向量 SVG 雙子星塔（帶有可愛天橋 Skybridge、圓潤塔身與微表情/萌感，或精緻的吉隆坡地標剪影風格），具有低飽和度與穿透感，且設定 `pointer-events: none` 確保完全不阻礙使用者的積木點選。

## 2. 視覺規格細節

### 背景配色 (Palette)
- 整體 body 背景：採用純白到淡淺藍柔和漸層（例如 `background: linear-gradient(180deg, #FFFFFF 0%, #F0F6FD 40%, #E6F0FA 100%);` 或精緻的淺藍天空光暈）。
- 卡片主體（`.card`, `.top`）：純白背景（`#FFFFFF`），搭配柔和淺藍微邊框（`border: 1px solid #E2EDF8;`）與微光陰影（`box-shadow: 0 4px 20px rgba(56, 125, 200, 0.06);`）。
- 主色調（Primary/Active）：優雅的藍色調（如 `#2563EB` 或 `#3B82F6`）。
- 積木卡片（`.block-btn`）：純白底、深灰字、淺藍描邊，選中或點擊時呈明亮天藍/清爽深藍反饋。

### 可愛版雙子星塔 (Cute Petronas Twin Towers SVG)
- 放置於頁面右下角（`position: fixed; right: 12px; bottom: 0; z-index: 0;`）。
- SVG 向量設計：
  - 雙塔對稱，中間有標誌性的空中天橋 (Skybridge)。
  - 塔身圓潤、塔尖帶有小天線。
  - 可愛風格（可帶萌系微笑表情、微腮紅，或現代扁平圓角向量風格）。
  - 大小適中（約寬 100~130px, 高 140~170px），在手機版右下角默默陪伴，透明度（opacity）控制在 0.85~0.95，搭配 `pointer-events: none`，使用者點擊該區域時點擊會直接穿透到下層，絕對不影響點擊「顯示解析」或積木。
- 確保學習核心卡片（`.card` 等）的 `z-index: 1; position: relative;` 高於裝飾層，操作清晰無礙。

## 3. 修改目標
- `src/style.css`：全面換新為純淨白 + 淺藍的高顏值樣式，配置右下角裝飾樣式。
- `src/ui/app.js`：在頁面中注入可愛版雙子星塔的 SVG 節點。

## 4. 驗收標準
- `npm test` 通過。
- `npm run lint` 通過。
- `npm run build` 通過。
- 畫面外觀煥然一新：清新純白 + 淺藍色調，右下角有辨識度極高且可愛的雙子星塔陪伴。
