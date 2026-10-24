# Spec: 重構 kawan-melayu 為「語言積木 (Sentence Scaffolding)」零基礎學習系統

## 1. 任務目標
將原專案的便利店遊戲機制（庫存、金錢、聲望、虛擬日數、隨機事件）全面移除，轉型為**純粹、零基礎友善的「語言積木階梯學習法 (Sentence Scaffolding)」**工具。

## 2. 核心功能設計
1. **積木架構 (Sentence Blocks)**：
   - 每個關卡/單元以一個核心主幹展開（例如：`Saya mau` -> `Saya mau air` -> `Saya mau air sejuk` -> `Boleh saya mau air sejuk?`）。
   - 提供「積木詞卡」：學習者可點擊積木拼出目標句子，或輸入鍵盤拼字。
   - 包含：馬來文、繁體中文對照、詞性提示、發音按鈕（使用瀏覽器 Web Speech API: `speechSynthesis.speak` 採用 `ms-MY` 或回退）。
2. **階梯式單元規劃 (5 大漸進階梯)**：
   - **Level 1: 拼讀與核心主詞 (Pronouns & Core)**: Saya (我), Awak/Anda (你), Ini (這個), Itu (那個), Mau/Nak (要), Boleh (可以).
   - **Level 2: 基礎需求與飲料食物 (Objects & Modifiers)**: air (水), sejuk (冰/冷), panas (熱), kopi (咖啡), nasi (飯). （體驗形容詞置後修飾：air sejuk = 冷水）
   - **Level 3: 問句與禮貌請求 (Polite Requests & Questions)**: Boleh saya minta...? (我可以要...嗎？), Ada...? (有...嗎？), Terima kasih (謝謝).
   - **Level 4: 數字與價格 (Numbers & Money)**: satu, dua, tiga... Berapa ringgit? (多少令吉？), lima ringgit (五令吉).
   - **Level 5: 便利店實戰 (Real-life Combinations)**: 結合前 4 級的完整組合句型。
3. **介面需求 (UI/UX)**：
   - 簡約乾淨的學習儀表板（非遊戲 POS 機介面，而是像現代沉浸式語言工具）。
   - 頂部：單元選單與學習進度（儲存於 localStorage）。
   - 中間：當前目標中文句、積木拼接區（Drop/Click area）、可用積木槽。
   - 輔助功能：即時語音發音 (Web Speech API)、詞語解析 tooltip、一鍵顯示解析。
4. **保留優質特性**：
   - 100% 離線可用，Vite 建置，純前端，無外部伺服器依賴。
   - 保留原專案之代碼品質標準：`npm run lint` 與 `npm test` 必須能通過。

## 3. 目標修改目錄
- `src/data/`：建立 `scaffolding-lessons.json`，存放結構化的階梯積木課程。
- `src/engine/`：移除原有的 economy/day/encounters 遊戲邏輯，改為 `scaffolding-engine.js`（處理積木檢核、進度推進、存檔）。
- `src/ui/`：重構渲染邏輯，支援積木點選、語音朗讀、進度切換。
- `tests/`：更新測試，確保積木組合判斷與進度儲存正常。

## 4. 驗收標準
- `npm run lint` 無報錯。
- `npm test` 通過所有單元測試。
- `npm run build` 建置成功。
