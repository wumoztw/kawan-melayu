# Spec: 將雙子星塔更換為「可愛版榴槤果園 (Durian Orchard)」

## 1. 任務目標
將右下角裝飾插圖由目前的「吉隆坡雙子星塔」完全替換為代表馬來西亞果王文化的**「可愛版榴槤果園 (Cute Durian Orchard)」**。

## 2. 視覺與向量 SVG 設計
- **插圖元素**：
  - **背景**：柔和綠意果園小緩坡/小山丘（Soft Orchard Hills）。
  - **榴槤樹 (Durian Tree)**：帶有茂密綠葉與垂掛著的小刺榴槤。
  - **前景主角 (Cute Durian)**：一個極具萌感的圓滾滾金黃榴槤寶寶：
    - 經典綠褐色鋸齒刺刺外殼。
    - 剖開露出飽滿金黃色的「貓山王 (Musang King)」果肉。
    - 帶有圓滾滾大眼睛、可愛微笑與粉嫩腮紅。
- **配置規格**：
  - 放置於右下角（`position: fixed; right: 12px; bottom: 0; pointer-events: none; z-index: 0;`）。
  - 大小：約寬 140px, 高 150px，色調明亮清新（金黃、嫩綠、柔和棕），與純白淺藍大背景完美融合。
  - 確保 `pointer-events: none` 穿透點擊，不阻礙下方積木按鈕與顯示解析按鈕。

## 3. 修改目標
- `src/ui/app.js`：將 `cuteTowers()` 移除並替換為 `cuteDurianOrchard()`。
- `src/style.css`：微調 `.landmark` 尺寸與陰影配置。

## 4. 驗收標準
- `npm test` 通過。
- `npm run lint` 通過。
- `npm run build` 通過。
- 雙子星塔徹底移除，右下角呈現生動可愛的馬來西亞榴槤果園。
