# Kawan Melayu — 語言積木

零基礎馬來語「語言積木階梯學習法 (Sentence Scaffolding)」：從核心主幹 `Saya mau` 一路擴展到
`Boleh saya minta satu air sejuk?`，點選積木或鍵盤輸入拼出句子，支援 Web Speech API 發音。

純前端、可完全離線；學習進度存在瀏覽器 localStorage。

## 指令
- `npm run dev` 開發
- `npm run build` 建置
- `npm run lint` / `npm test`

## 結構
- `src/data/scaffolding-lessons.json` 5 級階梯課程與詞彙表
- `src/engine/scaffolding-engine.js` 積木檢核、進度推進、存檔
- `src/ui/` 介面與語音
