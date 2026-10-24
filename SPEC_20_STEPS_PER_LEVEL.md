# Spec: 擴充每個等級為 20 個學習內容 (20 Steps Per Level Expansion)

## 1. 任務目標
現有的 20 個等級排版效果使用者非常滿意（嚴禁更動目前的 UI 佈局與折疊選單設計！）。
使用者的核心需求：目前的練習題數太少（每級約 6~8 個），必須將**每一個等級擴充為恰好 20 個循序漸進的 steps**（20 個等級 × 20 個 steps = 總計 400 個豐富學習內容）。

## 2. 結構設計準則
1. **維持 20 個等級與各等級主題不變**：
   - Level 1: 拼讀與核心主詞 (Pronouns & Core)
   - Level 2: 基礎需求與飲料食物 (Objects & Modifiers)
   - Level 3: 問句與禮貌請求 (Polite Requests & Questions)
   - Level 4: 數字、價格與時間 (Numbers, Money & Time)
   - Level 5: 便利店實戰 (Convenience Store Combinations)
   - Level 6: 熟食小販與街頭點餐 (Hawker & Ordering)
   - Level 7: 機場、交通與問路 (Airport & Transport)
   - Level 8: 購物與議價 (Shopping & Bargaining)
   - Level 9: 搭車與導航 (Ride-Hailing & Navigation)
   - Level 10: 社交破冰與自我介紹 (Social & Identity)
   - Level 11: 飯店住宿與服務 (Hotel & Lodging)
   - Level 12: 緊急情況與健康求助 (Emergency & Health)
   - Level 13: 進行狀態與動詞前綴 meN- (Active Verbs with meN-)
   - Level 14: 自身狀態 ber- 與 使役後綴 -kan (Prefix ber- & Suffix -kan)
   - Level 15: 被動態 di- 與 無意狀態 ter- (Passive di- & Involuntary ter-)
   - Level 16: 邏輯連接詞與複合句 (Conjunctions & Logic)
   - Level 17: 商務溝通與正式會議 (Business & Negotiations)
   - Level 18: 正式行政手續與銀行辦理 (Formal Administration & Banking)
   - Level 19: 觀點論述與社會議題 (Discourse & Opinions)
   - Level 20: 文化底蘊與傳統諺語 (Peribahasa & Culture)

2. **每級 20 個 steps 的組織方式**：
   - 可以將每個等級劃分為 2 門課（每課 10 步），或 4 門課（每課 5 步），但**每個等級底下的 steps 總數必須剛好為 20 步**。
   - 步與步之間必須嚴格貫徹「積木階梯法」：
     - Step 1: 極簡核心（2~3 詞）
     - Step 2~5: 逐步加入修飾詞、對象
     - Step 6~10: 變形為問句或加入禮貌詞
     - Step 11~15: 替換同類名詞/情境詞
     - Step 16~20: 複合長句與實戰模擬
3. **詞彙字典 100% 覆蓋**：
   - 所有在 400 個 steps 與所有 distractors 出現的單字，必須全部收錄於 `glossary` 中，並附帶詞性與精準繁體中文釋義。
   - 嚴格遵守 `tests/scaffolding-engine.test.js` 中的檢驗要求（所有單字都必須能在 glossary 找到）。

## 3. 測試與驗收標準
1. 修改 `tests/scaffolding-engine.test.js`：
   - 增加檢查：每一個 level 的 `level.lessons.flatMap(l => l.steps).length === 20`（總計 400 steps）。
   - 確保所有單元測試通過：`npm test`。
2. 確保 `npm run lint` 通過。
3. 確保 `npm run build` 通過。
4. 自動發布至 `gh-pages`。
