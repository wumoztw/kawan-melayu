# 專案進度

## M0 — 專案骨架、測試與 CI

- [x] 建立 Vite、Vitest/jsdom、ESLint 9 基礎設定與必要 scripts
- [x] 建立 CI 與 Pages 部署工作流程

## M1 — 資料格式、種子資料與審閱工具

- [x] 建立初、中、高期商品、NPC、句型與互動種子資料
- [x] 建立 30 天劇情、隨機事件與初／中期畢業小考題庫
- [x] 完成資料格式、欄位、ID、期別數量及參照驗證腳本
- [x] 完成依期別輸出馬來文與華語對照審閱表
- [x] 建立資料完整性、驗證器與匯出腳本測試
- [x] 通過 `npm run lint`、`npm test`、`npm run validate:data` 與 `npm run build`

## M2 — 純邏輯遊戲引擎與模擬

- [x] 建立可播種亂數、版本化狀態與每日流程狀態機
- [x] 建立庫存、訂價、營收、救濟借款與客人互動批改邏輯
- [x] 建立 Unicode 答案正規化、等級期別、畢業小考與 Leitner 字彙盒
- [x] 建立存檔驗證／遷移、localStorage 及 JSON 匯入匯出（預設排除金鑰）
- [x] 增加引擎單元測試與固定種子 10 天機器人玩家測試
- [x] 通過 `npm run lint`、`npm test`、`npm run validate:data` 與 `npm run build`

## M3 / M4 — UI 與初期可玩切片

- [x] 建立安全 DOM UI、七個畫面與五種元件；採嚴格 CSP、系統字型及離線資源
- [x] 支援逐字對話跳過、減少動態效果偏好、1-4 鍵盤操作與 Malay TTS 降級
- [x] 串接第 1-10 天流程、單字本、Leitner 等級、借款、存檔與 Day 10 十題小考
- [x] 移除舊版 game.js、style.css、smoke_test.js
- [x] 通過 `npm run lint`、`npm test`、`npm run validate:data` 與 `npm run build`

## M5 — 中期第 11–20 天與中期畢業小考

- [x] 建立 Lv.4–6 中期十天專屬互動：填空字庫與自由輸入、點選顯示華語
- [x] 加入訂價殺價、供應商訂貨／送貨、過期客訴、清真詢問、指路、日期時間及求助情境
- [x] 補足 Encik Lim（華裔）及 Encik Raju（印度裔）批發商設定與 Hari Raya、Tahun Baru Cina、Deepavali 節慶事件
- [x] Day 20 完成十題隨機中期考，七題（70
## M5 — 中期第 11–20 天與中期畢業小考

- [x] 建立 Lv.4–6 中期十天專屬互動：填空字庫與自由輸入、點選顯示華語
- [x] 加入訂價殺價、供應商訂貨／送貨、過期客訴、清真詢問、指路、日期時間及求助情境
- [x] 補足 Encik Lim（華裔）及 Encik Raju（印度裔）批發商設定與 Hari Raya、Tahun Baru Cina、Deepavali 節慶事件
- [x] Day 20 完成十題隨機中期考，七題（70%）通過
- [x] 保持本機資料與邏輯執行，無 AI 或網路服務依賴；擴充資料測試
