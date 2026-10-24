# Spec: 馬來語全階梯架構擴充 (初階 A1/A2 -> 中階 B1/B2 -> 高階 C1)

## 1. 任務目標
將 `src/data/scaffolding-lessons.json` 的課程體系完整拓展為 20 個等級：
- **初階 (A1-A2, Level 1~12)**：保留現有日常生存積木。
- **中階 (B1-B2, Level 13~16)**：引入馬來語核心「詞綴系統 (Imbuhan)」、動態進行、被動語態與複合連接句。
- **高階 (C1, Level 17~20)**：引入正式商務溝通、原因與假設論述、正式辦事手續、傳統文化成語 (Peribahasa)。

所有在步驟 (steps) 與干擾項 (distractors) 中使用的新單字，必須 100% 收錄於 `glossary`，並附帶詞性（含詞綴說明）與繁中釋義。

## 2. 中階與高階課程具體內容規劃

### 【中階篇：語法積木與詞綴系統 (Intermediate: Imbuhan & Complex Sentences)】

#### Level 13: 進行狀態與動詞前綴 meN- (Active Verbs with meN-)
- 概念：將字根轉為主動動作（如 baca -> membaca 閱讀，tulis -> menulis 書寫，beli -> membeli 購買，bantu -> membantu 幫助）。
- 詞彙：membeli (購買), membaca (閱讀), menulis (書寫), membantu (協助), sedang (正在), buku (書), surat (信/文件).
- 課程 13-1: 正在發生的動作 (Sedang + meN-)
  - Steps:
    1. `Saya sedang membaca buku` (我正在讀書)
    2. `Awak sedang menulis surat` (你正在寫信)
    3. `Dia sedang membeli makanan` (他正在買食物)
    4. `Boleh awak membantu saya?` (你可以協助我嗎？)
- 課程 13-2: 描述日常習慣
  - Steps:
    1. `Saya suka membaca buku` (我喜歡讀書)
    2. `Dia mahu membeli rumah` (他想要買房子)
    3. `Kita perlu membantu kawan` (我們需要幫助朋友)
    4. `Terima kasih kerana membantu saya` (謝謝你協助我)

#### Level 14: 狀態前綴 ber- 與 使役後綴 -kan (Prefix ber- & Suffix -kan)
- 概念：ber- 描述自身狀態（bercakap 說話，bekerja 工作）；-kan 將動作施加於對象（bersihkan 清潔，berikan 給予）。
- 詞彙：bercakap (說話/交談), bekerja (工作), berehat (休息), berikan (給予), bersihkan (打掃/清理), pejabat (辦公室), bilik (房間).
- 課程 14-1: 自身狀態與工作 (ber-)
  - Steps:
    1. `Saya bekerja di pejabat` (我在辦公室工作)
    2. `Dia mahu berehat sekarang` (他現在想要休息)
    3. `Boleh kita bercakap sekejap?` (我們可以談一下嗎？)
    4. `Saya sedang bercakap dengan doktor` (我正在和醫生交談)
- 課程 14-2: 施加動作於對象 (-kan)
  - Steps:
    1. `Tolong berikan saya kunci itu` (請把那把鑰匙給我)
    2. `Tolong bersihkan bilik ini` (請清理這個房間)
    3. `Boleh berikan saya resit?` (可以給我收據嗎？)
    4. `Saya akan bersihkan meja sekarang` (我現在會清理桌子)

#### Level 15: 被動態 di- 與 無意狀態 ter- (Passive di- & Involuntary ter-)
- 概念：被動態 di- 強調事情被完成（dimasak, ditutup）；ter- 表示無心之過或最高級（terlupa, terbaik）.
- 詞彙：dimasak (被煮/烹調), ditutup (被關閉), dibuka (被打開), terlupa (不小心忘了), terjatuh (不小心跌倒), terbaik (最好的), pintu (門), kedai (店).
- 課程 15-1: 空間與商店狀態 (di-)
  - Steps:
    1. `Pintu ini sudah ditutup` (這扇門已經被關上了)
    2. `Kedai itu dibuka pukul lapan` (那家店在八點被打開/開門)
    3. `Makanan ini dimasak sekarang` (這道食物現在正在被烹煮)
    4. `Semua bilik telah dibersihkan` (所有房間都已經被打掃乾淨了)
- 課程 15-2: 無心狀態與之最 (ter-)
  - Steps:
    1. `Maaf, saya terlupa bawa wang` (抱歉，我忘記帶錢了)
    2. `Kunci saya tertinggal di bilik` (我的鑰匙遺落在房間裡了)
    3. `Ini makanan terbaik di sini` (這是這裡最好吃的食物)
    4. `Dia tidak sengaja terjatuh` (他不是故意摔倒的)

#### Level 16: 邏輯連接詞與複合句 (Conjunctions & Logic)
- 概念：使用 kerana (因為), tetapi (但是), walaupun (雖然), jika (如果), supaya (以便).
- 詞彙：kerana (因為), tetapi (但是), walaupun (雖然), jika (如果), supaya (以便), penat (疲累), sibuk (忙碌), hujan (下雨), lewat (遲到/晚).
- 課程 16-1: 因果與轉折 (Kerana & Tetapi)
  - Steps:
    1. `Saya gembira kerana awak datang` (我很高興因為你來了)
    2. `Saya mahu pergi tetapi hujan` (我想去但是正在下雨)
    3. `Dia penat tetapi tetap bekerja` (他很累但依然工作)
    4. `Saya minta maaf kerana datang lewat` (我為遲到感到抱歉)
- 課程 16-2: 條件與目的 (Jika & Supaya)
  - Steps:
    1. `Jika ada masa, kita boleh jumpa` (如果有時間，我們可以見面)
    2. `Makan ubat ini supaya cepat sembuh` (吃這款藥以便快點痊癒)
    3. `Jika awak sibuk, tidak mengapa` (如果你忙，沒關係)
    4. `Belajar bersungguh-sungguh supaya berjaya` (認真學習以便取得成功)

---

### 【高階篇：商務、論述與成語 (Advanced: Formal & Idioms)】

#### Level 17: 商務溝通與正式會議 (Business & Negotiations)
- 詞彙：mesyuarat (會議), perjanjian (合約/協議), bersetuju (同意), cadangan (建議), harga (價格), pasaran (市場), syarikat (公司), bincang (討論).
- 課程 17-1: 表達立場與建議
  - Steps:
    1. `Syarikat kami ada cadangan baru` (我們公司有新的提案)
    2. `Kami bersetuju dengan harga ini` (我們同意這個價格)
    3. `Kita perlu bincang perkara ini` (我們需要討論這件事)
    4. `Mesyuarat akan bermula sekarang` (會議現在即將開始)
- 課程 17-2: 合約簽署與合作
  - Steps:
    1. `Sila semak dokumen perjanjian ini` (請審閱這份合約文件)
    2. `Kami mahu bekerjasama dengan anda` (我們希望能與您合作)
    3. `Perjanjian ini memberi manfaat bersama` (這份協議帶來雙贏/共同利益)
    4. `Terima kasih atas kerjasama anda` (感謝您的合作)

#### Level 18: 正式行政手續與銀行辦理 (Formal Administration & Banking)
- 詞彙：borang (表格), isi (填寫), akaun (帳戶), bank (銀行), pengesahan (驗證/確認), tandatangan (簽名), permohonan (申請), kad (卡).
- 課程 18-1: 填表與簽名
  - Steps:
    1. `Sila isi borang permohonan ini` (請填寫這份申請表格)
    2. `Sila letak tandatangan di sini` (請在這裡簽名)
    3. `Saya mahu buka akaun bank` (我想要開立銀行帳戶)
    4. `Tolong berikan kad pengenalan anda` (請出示您的身分證件)
- 課程 18-2: 審核與確認手續
  - Steps:
    1. `Permohonan anda sedang diproses` (您的申請正在審核處理中)
    2. `Kami memerlukan dokumen pengesahan alamat` (我們需要地址證明/驗證文件)
    3. `Proses ini mengambil masa tiga hari` (這個程序需要三天時間)
    4. `Semua urusan telah selesai hari ini` (所有手續今天都已辦妥)

#### Level 19: 觀點論述與社會議題 (Discourse & Opinions)
- 詞彙：pendapat (意見/觀點), penting (重要), masyarakat (社會), alam (自然/環境), sekitar (周圍/環境), masa depan (未來), teknologi (科技), pendidikan (教育).
- 課程 19-1: 表達個人見解
  - Steps:
    1. `Pada pendapat saya, pendidikan sangat penting` (依我看，教育非常重要)
    2. `Teknologi mengubah kehidupan masyarakat kita` (科技改變了我們社會的生活)
    3. `Kita mesti menjaga alam sekitar` (我們必須保護自然環境)
    4. `Masa depan negara bergantung pada generasi muda` (國家的未來仰賴年輕一代)
- 課程 19-2: 深入利弊分析
  - Steps:
    1. `Perkara ini mempunyai kebaikan dan keburukan` (這件事有利亦有弊)
    2. `Semua pihak perlu bertanggungjawab bersama` (各方都需要共同承擔責任)
    3. `Langkah ini sangat penting untuk masa depan` (這一步對未來至關重要)
    4. `Kita perlu mencari jalan penyelesaian terbaik` (我們需要尋求最佳解決方案)

#### Level 20: 文化底蘊與傳統諺語 (Peribahasa & Culture)
- 概念：馬來人說話極富含蓄與隱喻之美，學會 Peribahasa 是達到母語高階水平的象徵。
- 詞彙：bagai (如/像), aur (竹子), tebing (河岸), bulat (圓/團結), air (水), manusia (人), bukit (山), sama (相同), dipikul (肩挑/共同承擔).
- 課程 20-1: 互助與團結諺語
  - Steps:
    1. `Bagai aur dengan tebing` (如同竹子與河岸——相依為命、緊密合作)
    2. `Berat sama dipikul, ringan sama dijinjing` (重物一同肩挑，輕物一同提攜——同甘共苦)
    3. `Bulat air kerana pembetung, bulat manusia kerana muafakat` (水順溝渠而圓，人因團結共識而圓滿)
    4. `Hidup kita mesti saling membantu` (我們的生活必須互相幫助)
- 課程 20-2: 謙遜與努力諺語
  - Steps:
    1. `Sedikit-sedikit, lama-lama jadi bukit` (積少成多，終能聚沙成塔)
    2. `Ikut resmi padi, makin berisi makin tunduk` (遵循稻穗法則，越結實飽滿越謙遜低下)
    3. `Usaha tangga kejayaan` (努力是邁向成功的階梯)
    4. `Bahasa jiwa bangsa` (語言是民族的靈魂)

---

## 3. 測試與驗收標準
1. 修改 `tests/scaffolding-engine.test.js`：
   - 驗證 `assert.equal(data.levels.length, 20);`
   - 驗證結尾測試最後一課 `20-2` 的最後一步 `nextStep` 為 `null`。
2. 執行並全數通過：
   - `npm test`
   - `npm run lint`
   - `npm run build`
