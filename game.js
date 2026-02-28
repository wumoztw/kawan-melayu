/* ============================================================
   Kawan Melayu — game.js (ChatGPT-like layout v3.5.6)
   - Desktop: page is not scrollable; always scroll inside chat box
   - Mobile behavior unchanged
   ============================================================ */

if (window.marked) marked.setOptions({ breaks: true, gfm: true });

function defaultMission() {
  return { title: "", objective: "", step: 0, total: 0, status: "" };
}

let gameState = {
  confidence: 100,
  fluency: 0,
  level: 1,
  location: "嘛嘛檔（Kedai Mamak）",
  vocabulary: [],
  mission: defaultMission()
};

let messageHistory = [];
let lastRequestTime = 0;
const THROTTLE_LIMIT = 2500;

let currentAbortController = null;
let lastUserMessageText = "";

const FALLBACK_ORDER = ["openrouter", "groq", "gemini", "openai"];
const MAX_AUTO_RETRIES = 2;

const PROVIDERS = {
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      { id: "auto", name: "Auto" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
      { id: "deepseek/deepseek-r1-distill-llama-70b:free", name: "DeepSeek R1 (Free)" },
      { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)" }
    ]
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B" }
    ]
  },
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
      { id: "gemini-2.5-pro-exp-03-25", name: "Gemini 2.5 Pro (Exp)" }
    ]
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "o1-mini", name: "o1 Mini" }
    ]
  }
};

const SCENES = [
  {
    key: "mamak",
    minLevel: 1,
    name: "嘛嘛檔（Kedai Mamak）",
    roles: "服務生、阿姨、收銀",
    vibe: "鐵桌椅、炒粿條的香氣、玻璃杯叮噹聲",
    missionExamples: [
      "點一杯 Teh Tarik，並確認要不要 kurang manis（少糖）。",
      "點一份 roti canai，並問要不要加蛋（telur）。",
      "結帳並說謝謝。"
    ]
  },
  {
    key: "stall",
    minLevel: 3,
    name: "路邊小攤（Gerai）",
    roles: "攤販老闆、老闆娘",
    vibe: "炭火烤肉的煙、塑膠椅、車流聲",
    missionExamples: [
      "問價格（berapa）並指定外帶（bungkus）。",
      "選擇辣度（pedas / tak pedas）並加料。"
    ]
  },
  {
    key: "shop",
    minLevel: 5,
    name: "商店（Kedai）",
    roles: "店員",
    vibe: "冷氣、貨架、掃描器嗶聲",
    missionExamples: [
      "問某個商品在哪一排（di mana）。",
      "詢問促銷（promosi）並完成結帳。"
    ]
  },
  {
    key: "restaurant",
    minLevel: 7,
    name: "餐廳（Restoran）",
    roles: "服務生、領檯",
    vibe: "餐具碰撞聲、客人聊天、點餐本翻頁聲",
    missionExamples: [
      "訂位或表明人數，並提出不要冰（tak mau ais）或不要辣（tak pedas）。",
      "點主餐並加一個飲料。"
    ]
  },
  {
    key: "nightmarket",
    minLevel: 9,
    name: "夜市（Pasar malam）",
    roles: "小販",
    vibe: "人潮、燈泡、油鍋滋滋聲",
    missionExamples: [
      "排隊點餐並確認份量（satu / dua）。",
      "簡單詢問能不能便宜一點（boleh murah sikit）。"
    ]
  }
];

function getSceneByName(name) {
  const t = String(name || "").trim();
  if (!t) return null;
  return SCENES.find(s => s.name === t) || null;
}

function getUnlockedScenesByLevel(level) {
  return SCENES.filter(s => s.minLevel <= level);
}

function getCurrentScene() {
  return getSceneByName(gameState.location) || getUnlockedScenesByLevel(gameState.level)[0] || SCENES[0];
}

function sanitizeMission(m) {
  if (!m || typeof m !== "object") return null;
  const title = String(m.title || "").trim();
  const objective = String(m.objective || "").trim();
  let step = Number.isFinite(+m.step) ? Math.max(0, Math.floor(+m.step)) : 0;
  let total = Number.isFinite(+m.total) ? Math.max(0, Math.floor(+m.total)) : 0;
  const status = String(m.status || "").trim();
  if (!title && !objective && !step && !total && !status) return null;
  if (total > 0 && step > total) step = total;
  return { title, objective, step, total, status };
}

function buildSystemPrompt() {
  let ratioRule;
  if (gameState.level <= 3) ratioRule = "台灣華語為主、馬來文為輔（約 70%：30%）";
  else if (gameState.level <= 6) ratioRule = "馬來文為主、台灣華語為輔（約 70%：30%，可加入口語語氣詞：lah、meh）";
  else ratioRule = "幾乎全馬來文（約 90–100%），台灣華語只在必要時補充 1 句";

  const currentScene = getCurrentScene();
  const unlocked = getUnlockedScenesByLevel(gameState.level);
  const unlockedNames = unlocked.map(s => s.name).join("、");

  const m = gameState.mission || defaultMission();
  const missionSummary = (m.title || m.objective)
    ? `- 目前任務：${m.title || "（未命名任務）"}\n- 目標：${m.objective || ""}\n- 進度：${m.step || 0}/${m.total || 0}\n- 狀態：${m.status || ""}`
    : "- 目前任務：（尚無，請你立刻建立一個新任務）";

  const sceneHint = `- 目前地點：${gameState.location}\n- 目前可用場景（依等級解鎖）：${unlockedNames}\n- 當前場景氛圍提示：${currentScene.vibe}\n- 你可扮演的角色（擇一，不要每句換人）：${currentScene.roles}\n- 任務範例（擇一或自行改寫）：${currentScene.missionExamples.join("；")}`;

  return `你是一個在馬來西亞現場的情境式馬來文教練，同時也是對話中的店員/攤販/服務生（你要入戲扮演）。

【硬性語言規則（非常重要）】
- 你只能使用兩種語言：①台灣華語（繁體中文）②馬來文。
- 禁止使用英文（包含解釋、例句、標題、條列、註解、縮寫都不可以）。
- 教學節奏：從 0 開始，初期以台灣華語為主、馬來文輔佐；隨著玩家等級提升，逐漸改成馬來文為主、台灣華語輔佐。
- 本回合語言比例：${ratioRule}

【情境式對話（非常重要）】
- 你要讓使用者有身歷其境的感覺：每回合開頭先用 1–2 句簡短的場景描寫（聲音、氣味、動作、距離）。
- 然後你用「當下角色」的口吻直接跟使用者說話（短句、口語、自然），可加 lah、meh 但不要過度。
- 不要說你是模型、你在扮演、你在模擬；你就是現場那個人。

【任務系統（非常重要）】
- 你必須維持一個任務，讓使用者像在闖關。
- 若目前任務為空、或狀態是 completed，請立刻建立一個新任務（total 建議 2–4）。
- 每回合你要讓任務往前推進（step +1 或維持），並在最後的 action 裡回傳 mission 物件。
- 只有在「任務完成」且「使用者等級達到下一場景解鎖」時，你才可以在 action.location 指定新的地點（否則不要改 location）。

【回覆格式（固定）】
1) 場景：用 1–2 句描寫現在的環境。
2) 角色：用當下角色的口吻跟使用者說話（1–3 句）。
3) 你可以說：給使用者 1 句可直接照念的馬來文。
4) 新詞：最多 1–2 個（馬來文 + 台灣華語解釋）。

【action 規則（非常重要）】
- action 只用來給程式讀取，不要讓使用者看到。
- action 必須放在回覆的最後一行，格式如下（大小寫與符號要完全一樣）：
<action>{"confdelta":0,"fludelta":10,"leveldelta":0,"location":null,"vocabadded":"Nasi Lemak","mission":{"title":"點飲料","objective":"點一杯 Teh Tarik，並確認少糖","step":1,"total":3,"status":"ongoing"}}</action>
- action 行前面不要加任何文字。
- 如果無法遵守格式，請輸出空 action（mission 也要帶回）：
<action>{"confdelta":0,"fludelta":0,"leveldelta":0,"location":null,"vocabadded":"","mission":{"title":"","objective":"","step":0,"total":0,"status":""}}</action>

【目前玩家狀態】
- 信心值 confidence=${gameState.confidence}/100
- 流利度 fluency=${gameState.fluency}/100
- 等級 level=Lv.${gameState.level}
${sceneHint}
${missionSummary}
- 已學詞彙 vocabulary=${gameState.vocabulary.join(", ") || "（尚無）"}
`;
}

function getShell() {
  return document.getElementById("appShell");
}

function setShellClass(cls, enabled) {
  const shell = getShell();
  if (!shell) return;
  shell.classList.toggle(cls, !!enabled);
}

function isShellClass(cls) {
  const shell = getShell();
  return !!(shell && shell.classList.contains(cls));
}

function isMobileMode() {
  return window.matchMedia && window.matchMedia("(max-width: 820px)").matches;
}

window.toggleRightPanel = function () {
  const open = isShellClass("sidebar-open") || !isShellClass("sidebar-collapsed");
  if (open) closeRightPanel();
  else openRightPanel();
};

window.openRightPanel = function () {
  const overlay = document.getElementById("panelOverlay");
  const panel = document.getElementById("rightPanel");

  if (isMobileMode()) {
    setShellClass("sidebar-open", true);
    setShellClass("sidebar-collapsed", true);
    if (overlay) overlay.style.display = "block";
  } else {
    setShellClass("sidebar-collapsed", false);
  }

  localStorage.setItem("mud_sidebar_open", "1");
  localStorage.setItem("mud_panel_open", "1");
  if (panel) panel.setAttribute("aria-hidden", "false");
};

window.closeRightPanel = function () {
  const overlay = document.getElementById("panelOverlay");
  const panel = document.getElementById("rightPanel");

  setShellClass("sidebar-open", false);

  if (isMobileMode()) {
    if (overlay) overlay.style.display = "none";
    setShellClass("sidebar-collapsed", true);
  } else {
    setShellClass("sidebar-collapsed", true);
  }

  localStorage.setItem("mud_sidebar_open", "0");
  localStorage.setItem("mud_panel_open", "0");
  if (panel) panel.setAttribute("aria-hidden", "true");
};

window.toggleSettingsDrawer = function () {
  const willOpen = isShellClass("settings-collapsed");

  if (willOpen) {
    openRightPanel();
    setShellClass("settings-collapsed", false);
    localStorage.setItem("mud_settings_open", "1");

    setTimeout(() => {
      const el = document.getElementById("settingsDrawer");
      try { el?.scrollIntoView({ block: "start" }); } catch (e) {}
    }, 60);
    return;
  }

  setShellClass("settings-collapsed", true);
  localStorage.setItem("mud_settings_open", "0");
};

function getOptFallbackEnabled() {
  const el = document.getElementById("optFallback");
  return !!(el && el.checked);
}
function getOptSaveKeyInFile() {
  const el = document.getElementById("optSaveKeyInFile");
  return !!(el && el.checked);
}

function setBusyUI(isBusy) {
  const input = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const stopBtn = document.getElementById("stopBtn");
  if (input) input.disabled = isBusy;
  if (sendBtn) sendBtn.disabled = isBusy;
  if (sendBtn) sendBtn.innerText = isBusy ? "…" : "送出";
  if (stopBtn) stopBtn.disabled = !isBusy;
}

function enableRetryButton(enabled) {
  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.disabled = !enabled;
}

let userPinnedToBottom = true;
let userTouchingChat = false;

function syncComposerPadding() {
  const composer = document.querySelector(".composer");
  if (!composer) return;
  const h = Math.ceil(composer.getBoundingClientRect().height || 0);
  document.documentElement.style.setProperty("--composerPad", (h + 12) + "px");
}

function isScrollable(el) {
  if (!el) return false;
  return (el.scrollHeight - el.clientHeight) > 4;
}

function isNearBottom(el, threshold = 24) {
  if (!el) return true;
  const gap = el.scrollHeight - el.clientHeight - el.scrollTop;
  return gap < threshold;
}

function scrollToBottomCompat(el) {
  if (!el) return;
  try {
    if (typeof el.scrollTo === "function") el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    else el.scrollTop = el.scrollHeight;
  } catch (e) {
    try { el.scrollTop = el.scrollHeight; } catch (e2) {}
  }
}

function forceScrollLatestOnce() {
  const box = document.getElementById("mudChatBox");
  const loading = document.getElementById("mudLoading");
  if (!box) return;
  scrollToBottomCompat(box);
  try { (loading || box.lastElementChild)?.scrollIntoView({ block: "end" }); } catch (e) {}
}

let _scrollReq = 0;
function scrollChatToLatest(opts = {}) {
  const { force = false } = opts || {};
  const box = document.getElementById("mudChatBox");
  if (!box) return;

  if (!force) {
    if (isScrollable(box)) {
      if (!userPinnedToBottom) return;
      if (userTouchingChat) return;
    }
  }

  const token = ++_scrollReq;
  syncComposerPadding();

  const run = () => {
    if (token !== _scrollReq) return;
    forceScrollLatestOnce();
  };

  requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });
  setTimeout(run, 60);
  setTimeout(run, 180);
}

function initChatTouchScroll() {
  const box = document.getElementById("mudChatBox");
  if (!box) return;
  if (box.dataset.touchScrollInit === "1") return;
  box.dataset.touchScrollInit = "1";

  const refreshPinned = () => {
    userPinnedToBottom = isNearBottom(box, 24);
  };

  refreshPinned();

  box.addEventListener("scroll", () => {
    requestAnimationFrame(refreshPinned);
  }, { passive: true });

  box.addEventListener("touchstart", () => {
    userTouchingChat = true;
  }, { passive: true });

  box.addEventListener("touchmove", () => {
    userTouchingChat = true;
  }, { passive: true });

  box.addEventListener("touchend", () => {
    userTouchingChat = false;
    refreshPinned();
  }, { passive: true });

  box.addEventListener("touchcancel", () => {
    userTouchingChat = false;
    refreshPinned();
  }, { passive: true });

  box.addEventListener("pointerdown", () => {
    userTouchingChat = true;
  }, { passive: true });

  box.addEventListener("pointerup", () => {
    userTouchingChat = false;
    refreshPinned();
  }, { passive: true });

  box.addEventListener("pointercancel", () => {
    userTouchingChat = false;
    refreshPinned();
  }, { passive: true });
}

function appendUI(t, c, html = false) {
  const b = document.getElementById("mudChatBox");
  if (!b) return;

  const loading = document.getElementById("mudLoading");
  const d = document.createElement("div");
  d.className = "mud-msg " + c;
  if (html) d.innerHTML = t;
  else d.textContent = t;

  if (loading) b.insertBefore(d, loading);
  else b.appendChild(d);

  scrollChatToLatest();
}

function updateStatusUI() {
  gameState.confidence = Math.max(0, Math.min(100, gameState.confidence));
  gameState.fluency = Math.max(0, Math.min(100, gameState.fluency));
  gameState.level = Math.max(1, gameState.level);
  if (!gameState.mission) gameState.mission = defaultMission();

  const hpBar = document.getElementById("hpBar");
  const enBar = document.getElementById("enBar");
  const hpVal = document.getElementById("hpVal");
  const enVal = document.getElementById("enVal");
  const lvVal = document.getElementById("levelVal");
  const locVal = document.getElementById("locVal");

  if (hpBar) hpBar.style.width = gameState.confidence + "%";
  if (enBar) enBar.style.width = gameState.fluency + "%";
  if (hpVal) hpVal.textContent = gameState.confidence;
  if (enVal) enVal.textContent = gameState.fluency;
  if (lvVal) lvVal.textContent = "Lv. " + gameState.level;
  if (locVal) locVal.textContent = String(gameState.location || "").split("（")[0] || gameState.location;

  const list = document.getElementById("inventoryList");
  const counter = document.getElementById("vocabCount");
  if (list) {
    list.innerHTML = "";
    gameState.vocabulary.forEach(word => {
      const item = document.createElement("div");
      item.className = "vocab-item";
      item.textContent = word;
      list.appendChild(item);
    });
  }
  if (counter) counter.textContent = gameState.vocabulary.length + " 個詞";
}

window.handleProviderChange = function () {
  const providerKey = document.getElementById("apiProvider").value;
  const provider = PROVIDERS[providerKey];
  const modelSel = document.getElementById("modelSelect");
  const apiKeyInput = document.getElementById("apiKey");

  if (!provider || !modelSel) return;

  modelSel.innerHTML = "";
  provider.models.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    modelSel.appendChild(opt);
  });

  const savedKey = (localStorage.getItem("mudapikey" + providerKey) || "").trim();
  if (apiKeyInput) apiKeyInput.value = savedKey;

  const savedModel = localStorage.getItem("mudmodel" + providerKey);
  if (savedModel) {
    const opt = Array.from(modelSel.options).find(o => o.value === savedModel);
    if (opt) modelSel.value = savedModel;
  }

  saveConfig();
};

window.saveConfig = function () {
  const providerKey = (document.getElementById("apiProvider")?.value || "").trim();
  const key = (document.getElementById("apiKey")?.value || "").trim();
  const model = (document.getElementById("modelSelect")?.value || "").trim();

  if (providerKey) localStorage.setItem("mudprovider", providerKey);
  if (key) localStorage.setItem("mudapikey" + providerKey, key);
  if (model) localStorage.setItem("mudmodel" + providerKey, model);

  localStorage.setItem("mudoptfallback", document.getElementById("optFallback")?.checked ? "1" : "0");
  localStorage.setItem("mudoptsavekeyfile", document.getElementById("optSaveKeyInFile")?.checked ? "1" : "0");
};

function loadConfig() {
  const savedProvider = localStorage.getItem("mudprovider") || "openrouter";
  const providerSel = document.getElementById("apiProvider");
  if (providerSel) providerSel.value = savedProvider;

  handleProviderChange();

  const optFallback = document.getElementById("optFallback");
  const optSaveKeyFile = document.getElementById("optSaveKeyInFile");
  if (optFallback) optFallback.checked = localStorage.getItem("mudoptfallback") === "1";
  if (optSaveKeyFile) optSaveKeyFile.checked = localStorage.getItem("mudoptsavekeyfile") === "1";

  const settingsOpen = localStorage.getItem("mud_settings_open") === "1";
  setShellClass("settings-collapsed", !settingsOpen);

  const open = (localStorage.getItem("mud_sidebar_open") || localStorage.getItem("mud_panel_open")) === "1";
  if (open) openRightPanel();
  else closeRightPanel();
}

window.saveGame = function () {
  const includeKey = getOptSaveKeyInFile();
  const providerKey = document.getElementById("apiProvider")?.value || "";

  const saveData = {
    version: "3.5.6-desktop-chatbox-only-scroll",
    timestamp: new Date().toISOString(),
    gameState: JSON.parse(JSON.stringify(gameState)),
    messageHistory: messageHistory.slice(-20),
    config: {
      provider: providerKey,
      model: document.getElementById("modelSelect")?.value || "",
      apiKey: includeKey ? (document.getElementById("apiKey")?.value || "") : "",
      fallback: getOptFallbackEnabled()
    }
  };

  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `kawan-melayu-save-${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);

  appendUI("✅ 存檔完成！", "mud-ai mud-system", false);
};

window.loadGame = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (data.gameState) Object.assign(gameState, data.gameState);
      if (!gameState.mission) gameState.mission = defaultMission();

      if (data.messageHistory) messageHistory = data.messageHistory;
      else messageHistory = [{ role: "system", content: buildSystemPrompt() }];

      if (data.config) {
        const providerSel = document.getElementById("apiProvider");
        const modelSel = document.getElementById("modelSelect");
        const apiKeyInput = document.getElementById("apiKey");
        const optFallback = document.getElementById("optFallback");

        if (data.config.provider && providerSel) {
          providerSel.value = data.config.provider;
          handleProviderChange();
        }
        if (data.config.model && modelSel) {
          const opt = Array.from(modelSel.options).find(o => o.value === data.config.model);
          if (opt) modelSel.value = data.config.model;
        }
        if (data.config.apiKey && apiKeyInput) apiKeyInput.value = data.config.apiKey;
        if (typeof data.config.fallback === "boolean" && optFallback)
          optFallback.checked = data.config.fallback;
      }

      const chatBox = document.getElementById("mudChatBox");
      if (chatBox) {
        chatBox.innerHTML = `
          <div class="mud-loading" id="mudLoading" style="display:none">
            <span class="loading-dots">AI 思考中<span>.</span><span>.</span><span>.</span></span>
          </div>`;
      }

      messageHistory.forEach(m => {
        if (m.role === "user") appendUI(m.content, "mud-user");
        else if (m.role === "assistant") appendUI(extractTextForUI(m.content), "mud-ai");
      });

      scrollChatToLatest({ force: true });

      updateStatusUI();
      enableRetryButton(false);
      appendUI("✅ 讀檔完成！繼續加油～", "mud-ai mud-system", false);

      initChatTouchScroll();
    } catch (err) {
      appendUI("❌ 讀檔失敗，請確認檔案格式正確。", "mud-ai mud-system", false);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
};

window.stopRequest = function () {
  if (currentAbortController) {
    try { currentAbortController.abort(); } catch (e) {}
  }
};

window.retryLastMessage = function () {
  if (!lastUserMessageText) return;
  const input = document.getElementById("userInput");
  if (input) input.value = lastUserMessageText;
  userPinnedToBottom = true;
  scrollChatToLatest({ force: true });
  sendMessage(true);
};

window.clearChat = function () {
  messageHistory = [{ role: "system", content: buildSystemPrompt() }];
  const chat = document.getElementById("mudChatBox");
  if (chat) {
    chat.innerHTML = `
      <div class="mud-loading" id="mudLoading" style="display:none">
        <span class="loading-dots">AI 思考中<span>.</span><span>.</span><span>.</span></span>
      </div>`;
  }
  enableRetryButton(false);

  gameState.mission = defaultMission();
  updateStatusUI();

  appendUI("💬 新對話已開始。你會拿到新的任務。", "mud-ai mud-system", false);
  userPinnedToBottom = true;
  scrollChatToLatest({ force: true });
};

window.toggleHelpModal = function () {
  const modal = document.getElementById("helpModal");
  if (!modal) return;
  modal.style.display = modal.style.display === "flex" ? "none" : "flex";
};

function pruneHistoryKeepRecentTurns(maxTurns = 6) {
  if (!messageHistory || messageHistory.length <= 1) return;
  const system = messageHistory[0]?.role === "system"
    ? messageHistory[0]
    : { role: "system", content: buildSystemPrompt() };

  const rest = messageHistory.slice(1);
  const keepCount = Math.max(0, maxTurns * 2);
  const trimmed = rest.length > keepCount ? rest.slice(rest.length - keepCount) : rest;
  messageHistory = [system, ...trimmed];
}

function stripTrailingActionLikeLines(text) {
  if (!text) return "";
  let t = String(text).replace(/\r\n/g, "\n");
  for (let i = 0; i < 5; i++) {
    const before = t;
    t = t
      .replace(/\n?\s*<\s*action\s*>[\s\S]*?<\/\s*action\s*>\s*$/i, "")
      .replace(/\n?\s*<\s*action\s*>[\s\S]*$/i, "")
      .replace(/\n?\s*\baction\s*\"?\s*{[\s\S]*?}\s*$/i, "")
      .replace(/\n?\s*<\/?\s*action\s*>\s*$/i, "")
      .trimEnd();
    if (t === before) break;
  }
  return t;
}

function extractTextForUI(text) {
  let clean = String(text || "");
  clean = clean.replace(/<\s*think\s*>[\s\S]*?<\/\s*think\s*>/gi, "");
  clean = clean.replace(/<\s*action\s*>[\s\S]*?<\/\s*action\s*>/gi, "");
  clean = stripTrailingActionLikeLines(clean);
  clean = clean.replace(/^\s*action\s*/gim, "");
  clean = clean.replace(/<\/?action>/gi, "");
  clean = clean.replace(/```json/gi, "").replace(/```/gi, "");
  return clean.trim();
}

function tryParseActionFromText(text) {
  const t = String(text || "");
  let match = t.match(/<\s*action\s*>([\s\S]*?)<\/\s*action\s*>/i);
  if (match?.[1]) {
    const s = match[1].replace(/```json/gi, "").replace(/```/gi, "").trim();
    try { return JSON.parse(s); } catch (e) {}
  }
  match = t.match(/\baction\s*\"?\s*({[\s\S]*?})/i);
  if (match?.[1]) {
    try { return JSON.parse(match[1]); } catch (e) {}
  }
  const candidates = t.match(/{[\s\S]*?}/g) || [];
  for (const c of candidates) {
    if (!/confdelta|fludelta|leveldelta|location|vocabadded/i.test(c)) continue;
    try { return JSON.parse(c); } catch (e) {}
  }
  return null;
}

function applyActionDeltas(text) {
  const action = tryParseActionFromText(text);
  if (!action) { updateStatusUI(); return; }

  let incomingMission = null;
  try {
    if (typeof action.confdelta === "number") gameState.confidence += action.confdelta;
    if (typeof action.fludelta === "number") gameState.fluency += action.fludelta;
    if (typeof action.leveldelta === "number") gameState.level += action.leveldelta;

    incomingMission = sanitizeMission(action.mission);
    if (incomingMission) gameState.mission = incomingMission;

    if (action.vocabadded) {
      String(action.vocabadded).split(",").forEach(w => {
        const t = w.trim();
        if (t && !gameState.vocabulary.includes(t)) gameState.vocabulary.push(t);
      });
    }

    if (action.location && String(action.location).trim()) {
      const target = getSceneByName(String(action.location).trim());
      if (target && target.minLevel <= gameState.level) {
        const same = target.name === gameState.location;
        const completed = (incomingMission?.status === "completed") || (gameState.mission?.status === "completed");
        if (same || completed) gameState.location = target.name;
      }
    }

  } catch (e) {
    console.warn("Action apply error", e);
  }

  updateStatusUI();
}

function normalizeErrorMessage(err, res) {
  if (err?.name === "AbortError") return "⏹ 已停止請求。";
  if (res?.status === 401) return "❌ API Key 無效或未授權（401）。";
  if (res?.status === 403) return "❌ 存取被拒（403），請確認 Key 有效。";
  if (res?.status === 405) return "❌ 端點不支援此呼叫方式（405），請換供應商或模型。";
  if (res?.status === 429) return "⏳ 請求太頻繁或額度已滿（429），請稍後再試。";
  if (res?.status >= 500) return `🔴 供應商伺服器錯誤（${res.status}），稍後再試或開啟自動備援。`;
  if (err?.message) return err.message;
  return "❌ 請求失敗，請稍後再試。";
}

function messagesToGeminiContents(messages) {
  const result = [];
  const system = messages.find(m => m.role === "system");
  const others = messages.filter(m => m.role !== "system");

  if (system) {
    result.push({ role: "user", parts: [{ text: "[系統指示]\n" + system.content }] });
    result.push({ role: "model", parts: [{ text: "我已了解指示，準備開始。" }] });
  }

  others.forEach(m => {
    result.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }]
    });
  });
  return result;
}

async function requestWithProvider({ providerKey, key, modelId, payloadMessages, signal }) {
  const provider = PROVIDERS[providerKey];
  let activeModel = modelId;

  if (modelId === "auto" && providerKey === "openrouter")
    activeModel = "meta-llama/llama-3.3-70b-instruct:free";

  if (providerKey === "gemini") {
    const url = `${provider.baseUrl}/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(key)}`;
    const body = {
      contents: messagesToGeminiContents(payloadMessages),
      generationConfig: { temperature: 0.7 }
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal
    });
    return { res, activeModel, isGeminiNative: true };
  }

  const res = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: activeModel,
      messages: payloadMessages,
      temperature: 0.7
    }),
    signal
  });
  return { res, activeModel, isGeminiNative: false };
}

function extractAiTextFromResponse(providerKey, data) {
  if (providerKey === "gemini") {
    return (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
  }
  return data?.choices?.[0]?.message?.content || "";
}

function getFallbackChain(primaryKey) {
  if (!getOptFallbackEnabled()) return [primaryKey];
  return [primaryKey, ...FALLBACK_ORDER.filter(k => k !== primaryKey)];
}

window.sendMessage = async function (isRetry = false) {
  const providerKey = document.getElementById("apiProvider").value;
  const modelId = document.getElementById("modelSelect").value;

  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (input.disabled || !text) return;

  const getKeyForProvider = (pk) => {
    const currentSelected = document.getElementById("apiProvider").value;
    const directInput = document.getElementById("apiKey").value.trim();
    if (pk === currentSelected && directInput) return directInput;
    return (localStorage.getItem("mudapikey" + pk) || "").trim();
  };

  const primaryKey = getKeyForProvider(providerKey);
  if (!primaryKey) {
    appendUI("⚠️ 請先填入 API Key（或為備援供應商也填好 Key）。", "mud-ai mud-system", false);
    if (isShellClass("settings-collapsed")) toggleSettingsDrawer();
    if (isShellClass("sidebar-collapsed") && !isMobileMode()) openRightPanel();
    return;
  }

  const now = Date.now();
  if (!isRetry && now - lastRequestTime < THROTTLE_LIMIT) return;
  lastRequestTime = now;

  lastUserMessageText = text;

  setBusyUI(true);
  enableRetryButton(false);

  userPinnedToBottom = true;

  appendUI(text, "mud-user");
  input.value = "";

  const loader = document.getElementById("mudLoading");
  if (loader) loader.style.display = "block";
  scrollChatToLatest({ force: true });

  if (messageHistory.length === 0) messageHistory.push({ role: "system", content: buildSystemPrompt() });
  if (messageHistory[0].role === "system") messageHistory[0].content = buildSystemPrompt();

  messageHistory.push({ role: "user", content: text });
  pruneHistoryKeepRecentTurns(6);

  const payloadMessages = JSON.parse(JSON.stringify(messageHistory));
  currentAbortController = new AbortController();

  const chain = getFallbackChain(providerKey);
  let lastErr = null;

  try {
    for (const pk of chain) {
      const key = getKeyForProvider(pk);
      if (!key) continue;

      for (let r = 0; r <= MAX_AUTO_RETRIES; r++) {
        let res = null;
        try {
          const out = await requestWithProvider({
            providerKey: pk,
            key,
            modelId,
            payloadMessages,
            signal: currentAbortController.signal
          });
          res = out.res;

          if (!res.ok) {
            if ((res.status === 429 || res.status >= 500) && r < MAX_AUTO_RETRIES) {
              await new Promise(s => setTimeout(s, 500 + r * 800));
              continue;
            }
            throw { res };
          }

          const data = await res.json();
          const aiMsg = extractAiTextFromResponse(pk, data);
          if (!aiMsg) throw new Error("Empty response.");

          applyActionDeltas(aiMsg);
          const cleanMsg = extractTextForUI(aiMsg);

          messageHistory.push({ role: "assistant", content: aiMsg });
          pruneHistoryKeepRecentTurns(6);

          if (loader) loader.style.display = "none";

          const b = document.getElementById("mudChatBox");
          const d = document.createElement("div");
          d.className = "mud-msg mud-ai";
          b.insertBefore(d, document.getElementById("mudLoading"));

          let i = 0;
          function typeWriter() {
            if (i < cleanMsg.length) {
              d.textContent = cleanMsg.substring(0, i + 1);
              i++;
              scrollChatToLatest();
              setTimeout(typeWriter, 10);
            } else {
              d.innerHTML = marked.parse(cleanMsg);
              scrollChatToLatest();
              setBusyUI(false);
              enableRetryButton(true);
              input.focus();
            }
          }
          typeWriter();

          currentAbortController = null;
          return;

        } catch (e) {
          if (e?.name === "AbortError") throw e;
          lastErr = e;
          if (e?.res && !(e.res.status === 429 || e.res.status >= 500)) break;
        }
      }
    }

    throw lastErr || new Error("All providers failed.");
  } catch (e) {
    if (loader) loader.style.display = "none";

    if (e?.name === "AbortError")
      appendUI("⏹ 已停止請求。", "mud-ai mud-system", false);
    else if (e?.res)
      appendUI(normalizeErrorMessage(null, e.res), "mud-ai mud-system", false);
    else
      appendUI(normalizeErrorMessage(e, null), "mud-ai mud-system", false);

    setBusyUI(false);
    enableRetryButton(true);
    currentAbortController = null;
  }
};

window.handleKeyPress = function (e) {
  if (e.key === "Enter" && !e.shiftKey && !document.getElementById("sendBtn").disabled) {
    sendMessage();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadConfig();
  updateStatusUI();

  messageHistory = [{ role: "system", content: buildSystemPrompt() }];

  syncComposerPadding();

  appendUI(
    "你現在在嘛嘛檔（Kedai Mamak）。等一下我會給你一個任務，你照著『你可以說』那句講就好，第一次使用請先在下方輸入框輸入：你好",
    "mud-ai mud-system",
    false
  );

  initChatTouchScroll();

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    try { closeRightPanel(); } catch(e) {}
    setShellClass("settings-collapsed", true);
    localStorage.setItem("mud_settings_open", "0");
  });

  window.addEventListener("resize", () => {
    const overlay = document.getElementById("panelOverlay");
    if (overlay) {
      if (isMobileMode() && isShellClass("sidebar-open")) overlay.style.display = "block";
      else overlay.style.display = "none";
    }
    syncComposerPadding();
    scrollChatToLatest();
    initChatTouchScroll();
  });
});
