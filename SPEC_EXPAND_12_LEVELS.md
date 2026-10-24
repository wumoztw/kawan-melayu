# Spec: 全面擴充馬來語生活課程題庫至 12 級 (Full 12-Level Scaffolding Syllabus)

## 1. 任務目標
將 `src/data/scaffolding-lessons.json` 全面擴充為 12 個完整的漸進等級，收錄所有日常生活高頻情境。所有在 steps 與 distractors 中出現的詞彙必須 100% 收錄於 `glossary`，並確保 `tests/scaffolding-engine.test.js` 與 `npm test`、`npm run lint`、`npm run build` 全部通過。

## 2. 12 級完整架構規劃

### 現有 1~7 級深化：
- **Level 1: 拼讀與核心主詞 (Pronouns & Core)**: Saya, Awak, Anda, Ini, Itu, Mau, Nak, Boleh.
- **Level 2: 基礎需求與飲料食物 (Objects & Modifiers)**: air, sejuk, panas, kopi, nasi, teh, ais, susu.
- **Level 3: 問句與禮貌請求 (Polite Requests & Questions)**: Boleh saya minta, Ada, Terima kasih, sama-sama.
- **Level 4: 數字、價格與時間 (Numbers, Money & Time)**: satu~sepuluh, puluh, ratus, ringgit, berapa, pukul.
- **Level 5: 便利店實戰 (Convenience Store)**: 結合前 4 級的完整組合句。
- **Level 6: 熟食小販與茶餐室文化 (Hawker & Mamak Culture)**:
  - 增加拉茶、美祿、椰漿飯、煎蛋、外帶、內用：mee, goreng, ayam, pedas, kurang, manis, bungkus, makan, sini, teh, tarik, milo, lemak, telur.
- **Level 7: 機場、交通與問路 (Airport & Transport)**:
  - stesen, kereta, api, bas, ke, mana, di, lapangan, terbang, tiket, tolong.

### 全新擴充 8~12 級：
- **Level 8: 購物與議價 (Shopping & Bargaining)**
  - 詞彙：murah (便宜), mahal (貴), sikit (一點), saiz (尺寸), besar (大), kecil (小), warna (顏色), hitam (黑), putih (白), merah (紅), boleh murah sikit (可以便宜一點嗎).
  - 課程 8-1: 詢問尺寸與顏色
  - 課程 8-2: 價格評價與殺價請求
- **Level 9: 搭車與導航 (Ride-Hailing & Navigation)**
  - 詞彙：jalan (走/路), terus (直走), kiri (左), kanan (右), belok (轉彎), berhenti (停車), dekat (近), jauh (遠), sini (這裡), sana (那裡), depan (前面).
  - 課程 9-1: 方向指引（直走、左轉、右轉）
  - 課程 9-2: Grab/計程車司機溝通（停在前面、這裡）
- **Level 10: 社交破冰與自我介紹 (Social & Identity)**
  - 詞彙：nama (名字), siapa (誰), dari (來自), kawan (朋友), sudah (已經), belum (還沒), makan (吃), apa (什麼), khabar (消息/近況), baik (好).
  - 課程 10-1: Apa khabar 與 自我介紹 (Nama saya... / Saya dari Taiwan)
  - 課程 10-2: Sudah makan? 與日常寒暄
- **Level 11: 飯店住宿與服務需求 (Hotel & Lodging)**
  - 詞彙：hotel (飯店), bilik (房間), kunci (鑰匙), daftar (登記), masuk (進/入住), keluar (出/退房), tuala (毛巾), tukar (更換), tandas (洗手間), kata laluan (密碼), wifi.
  - 課程 11-1: 辦理入住與退房 (Daftar masuk / daftar keluar)
  - 課程 11-2: 房務需求與設施詢問 (Tukar tuala / WiFi kata laluan)
- **Level 12: 緊急情況與健康求助 (Emergency & Health)**
  - 詞彙：sakit (痛/生病), kepala (頭), perut (肚子), ubat (藥), farmasi (藥局), hospital (醫院), doktor (醫生), polis (警察), bahaya (危險), hilang (遺失), pasport (護照).
  - 課程 12-1: 身體不適與買藥 (Sakit kepala / perut, farmasi)
  - 課程 12-2: 緊急報警與求助 (Tolong panggil polis / Pasport saya hilang)

## 3. 測試與驗收標準
1. 修改 `tests/scaffolding-engine.test.js`：
   - 更新 `assert.equal(data.levels.length, 12);`
   - 課程結尾測試驗證最後一課 `12-2` 的最後一步 `nextStep` 為 `null`。
2. 執行並通過：
   - `npm test`
   - `npm run lint`
   - `npm run build`
3. 確保無任何缺少 glossary 映射的詞彙報錯。
