# Spec: 擴充馬來語生活情境題庫 (Level 6 & Level 7)

## 1. 任務目標
在 `src/data/scaffolding-lessons.json` 中擴充兩個全新的實用情境等級，並確保詞彙庫（glossary）完整收錄新單字：
- **Level 6: 熟食小販與街頭點餐 (Hawker Stall & Ordering)**
- **Level 7: 機場、交通與問路 (Airport, Transport & Directions)**

同步更新單元測試 `tests/scaffolding-engine.test.js`，確保 7 個等級的所有詞彙均被 glossary 完整解析。

## 2. 擴充內容設計

### 新增詞彙庫 (Glossary 擴充)
- 小販與點餐：
  - `mee`: { "zh": "麵", "pos": "名詞" }
  - `goreng`: { "zh": "炒／炸", "pos": "動詞／形容詞" }
  - `ayam`: { "zh": "雞／雞肉", "pos": "名詞" }
  - `pedas`: { "zh": "辣", "pos": "形容詞" }
  - `kurang`: { "zh": "少／減少", "pos": "副詞" }
  - `manis`: { "zh": "甜", "pos": "形容詞" }
  - `bungkus`: { "zh": "打包／外帶", "pos": "動詞" }
  - `makan`: { "zh": "吃／內用", "pos": "動詞" }
  - `sini`: { "zh": "這裡", "pos": "副詞／指示詞（makan sini＝內用）" }
- 交通與問路：
  - `stesen`: { "zh": "車站", "pos": "名詞" }
  - `kereta`: { "zh": "車／火車", "pos": "名詞" }
  - `api`: { "zh": "火（kereta api＝火車）", "pos": "名詞" }
  - `bas`: { "zh": "巴士／公車", "pos": "名詞" }
  - `ke`: { "zh": "往／到", "pos": "介系詞" }
  - `mana`: { "zh": "哪裡（ke mana＝去哪裡）", "pos": "疑問詞" }
  - `di`: { "zh": "在", "pos": "介系詞" }
  - `lapangan`: { "zh": "廣場／場地", "pos": "名詞" }
  - `terbang`: { "zh": "飛（lapangan terbang＝機場）", "pos": "動詞" }
  - `tiket`: { "zh": "票", "pos": "名詞" }
  - `tolong`: { "zh": "幫忙／請", "pos": "動詞／禮貌詞" }

### Level 6 規劃：熟食小販與街頭點餐
- **Lesson 6-1: 炒麵炒飯與辣度需求**
  - Steps:
    1. `Saya mau mee goreng` (我要炒麵)
    2. `Saya mau nasi goreng ayam` (我要雞肉炒飯)
    3. `Kurang pedas` (少辣)
    4. `Kurang manis` (少甜)
- **Lesson 6-2: 內用還是外帶？**
  - Steps:
    1. `Makan sini` (在這裡吃／內用)
    2. `Bungkus` (打包／外帶)
    3. `Boleh bungkus satu mee goreng?` (可以打包一份炒麵嗎？)
    4. `Terima kasih` (謝謝)

### Level 7 規劃：交通與問路
- **Lesson 7-1: 機場與車站詢問**
  - Steps:
    1. `Di mana stesen bas?` (巴士站在哪裡？)
    2. `Di mana stesen kereta api?` (火車站在哪裡？)
    3. `Di mana lapangan terbang?` (機場在哪裡？)
    4. `Tolong, saya mau ke lapangan terbang` (請幫忙，我要去機場)
- **Lesson 7-2: 購票與出發**
  - Steps:
    1. `Saya mau satu tiket` (我要一張票)
    2. `Satu tiket ke stesen bas` (一張去巴士站的票)
    3. `Berapa ringgit satu tiket?` (一張票多少令吉？)
    4. `Tiga ringgit. Terima kasih.` (三令吉。謝謝。)

## 3. 測試與驗收
1. 更新 `tests/scaffolding-engine.test.js` 中 `assert.equal(data.levels.length, 7);` 及最後課程 ID `7-2` 結束檢驗。
2. 確保 `npm test` 通過。
3. 確保 `npm run lint` 通過。
4. 確保 `npm run build` 通過。
