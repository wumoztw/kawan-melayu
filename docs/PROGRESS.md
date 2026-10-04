# 第二輪進度（依實際測試記錄）

| 功能 | 狀態 | 證明測試 |
|---|---|---|
| 空字串不可答對 | 已完成 | `tests/grading.test.js`：空白輸入與空白標準答案皆為 false |
| 存檔狀態版本 v2 | 已完成 | `tests/state.test.js`、`tests/save.test.js` |
| Day 1 引擎答題、經濟、單字複習、存檔恢復 | 已完成 | `tests/e2e/day1.test.js` |
| 真 DOM 遊玩流程、鍵盤 1、localStorage 儲存、無注入節點 | 已完成（jsdom，不是瀏覽器自動化） | `tests/e2e/app.test.js` |
| 第 2、3 天規則劇情、補貨扣款與 Mak Cik 旗標對話 | 已完成 | `tests/e2e/day1.test.js` |
| 試玩結束畫面、缺貨路徑 | 已完成 | `tests/e2e/day1.test.js` |
| entry point 瘦身與 DOM 安全接線 | 已完成 | `tests/wiring.test.js` |
| 第 1 天劇本與題目資料 | 部分完成：沿用既有 encounters 資料做映射，尚未獨立遷移/審定專用劇本 | `tests/e2e/day1.test.js`；`npm run validate:data` |
| 嚴格可玩資料驗證 | 部分完成：檢查互動類型、對話與提示；尚未全面驗證答案欄位／所有數值範圍 | `npm run validate:data`（37 商品、10 NPC、65 互動、30 日） |
| 舊題移入 `src/data/_draft/` | 未完成（現有資料仍由既有測試與資料流程使用） | 無 |
| 完整 30 日流程、輸入式答案、瀏覽器跨工作階段測試 | 未完成 | 無 |

## R1 先紅證據

在實作 `src/engine/game.js`、`src/app.js` 前新增 `tests/e2e/day1.test.js` 與 `tests/wiring.test.js`。第一次執行：

```text
npm test -- --run tests/e2e/day1.test.js tests/wiring.test.js
```

失敗證據：Vitest 報告 `Failed to resolve import "../../src/engine/game.js"`；接線測試因 `readFileSync` 收到非 file URL 失敗。代表尚無遊戲引擎/應用接線，且測試路徑本身需改用工作目錄解析。修正路徑後、實作前的第二次紅燈：接線測試指出 entrypoint/app 不符預期，E2E 測試指出缺少 `game.view`（之後測試依公開 `view(game)` API 修正）。

目前自動化 DOM 測試使用 Vitest + jsdom，不能等同真實瀏覽器／Playwright E2E；此限制不宣稱為瀏覽器端到端驗證完成。
