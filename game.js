/* ============================================================
   Kawan Melayu — game.js (ChatGPT-like layout v3.3)
   - 多 Provider、fallback、save/load、action 解析、打字機效果
   - 更新：聊天視窗改為「智能滾動」：使用者在底部才自動捲動；使用者往上滑閱讀時不會被強制拉回底部
   ============================================================ */

if (window.marked) marked.setOptions({ breaks: true, gfm: true });

let gameState = {
  confidence: 100,
  fluency: 0,
  level: 1,
  location: "Mamak Stall",
  vocabulary: []
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

/* =========================
   System Prompt
   ========================= */
function buildSystemPrompt() {
  let ratioRule;
  if (gameState.level <= 3) ratioRule = "台灣華語為主、馬來文為輔（約 70%：30%）";
  else if (gameState.level <= 6) ratioRule = "馬來文為主、台灣華語為輔（約 70%：30%，可加入口語語氣詞：lah、meh）";
  else ratioRule = "幾乎全馬來文（約 90–100%），台灣華語只在必要時補充 1 句";

  return `你是馬來文（Bahasa Melayu）的情境教學導師，場景在馬來西亞嘛嘛檔（Mamak Stall）。

【硬性語言規則（非常重要）】
- 你只能使用兩種語言：①台灣華語（繁體中文）②馬來文。
- 禁止使用英文（包含解釋、例句、標題、條列、註解、縮寫都不可以）。
- 教學節奏：從 0 開始，初期以台灣華語為主、馬來文輔佐；隨著玩家等級提升，逐漸改成馬來文為主、台灣華語輔佐。
- 本回合語言比例：${ratioRule}

【教學策略】
1. 回覆要短、可立即拿來講，避免長篇理論。
2. 每回合最多教 1–2 個新詞（新詞用馬來文呈現，台灣華語解釋）。
3. 依玩家狀態調整難度並鼓勵他開口。

【輸出格式（固定）】
- 先輸出「台灣華語（繁中）」為主的教學引導（初期），或「馬來文」為主的對話（中後期）。
- 不管比例如何，每回合都要讓使用者看得懂你要他說哪一句。

【action 規則（非常重要）】
- action 只用來給程式讀取，不要讓使用者看到。
- action 必須放在回覆的最後一行，格式如下（大小寫與符號要完全一樣）：
<action>{"confdelta":0,"fludelta":10,"leveldelta":0,"location":null,"vocabadded":"Nasi Lemak"}</action>
- action 行前面不要加任何文字。
- 如果無法遵守格式，請輸出空 action：
<action>{"confdelta":0,"fludelta":0,"leveldelta":0,"location":null,"vocabadded":""}</action>

【目前玩家狀態】
- 信心值 confidence=${gameState.confidence}/100
- 流利度 fluency=${gameState.fluency}/100
- 等級 level=Lv.${gameState.level}
- 地點 location=${gameState.location}
- 已學詞彙 vocabulary=${gameState.vocabulary.join(", ") || "（尚無）"}
`;
}

/* =========================
   Shell helpers
   ========================= */
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

/* =========================
   Sidebar
   ========================= */
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

/* =========================
   Options
   ========================= */
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

/* =========================
   Chat scrolling
   ========================= */
function isNearBottom(el, threshold = 120) {
  if (!el) return true;
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distance <= threshold;
}

function scrollToBottom(el) {
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

/* =========================
   Chat rendering
   ========================= */
function appendUI(t, c, html = false) {
  const b = document.getElementById("mudChatBox");
  if (!b) return;

  const loading = document.getElementById("mudLoading");
  const stick = isNearBottom(b);

  const d = document.createElement("div");
  d.className = "mud-msg " + c;
  if (html) d.innerHTML = t;
  else d.textContent = t;

  if (loading) b.insertBefore(d, loading);
  else b.appendChild(d);

  if (stick) scrollToBottom(b);
}

function updateStatusUI() {
  gameState.confidence = Math.max(0, Math.min(100, gameState.confidence));
  gameState.fluency = Math.max(0, Math.min(100, gameState.fluency));
  gameState.level = Math.max(1, gameState.level);

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
  if (locVal) locVal.textContent = gameState.location;

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

/* =========================
   Provider UI / Config
   ========================= */
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

/* =========================
   Save / Load game
   ========================= */
window.saveGame = function () {
  const includeKey = getOptSaveKeyInFile();
  const providerKey = document.getElementById("apiProvider")?.value || "";

  const saveData = {
    version: "3.3-ui-smart-scroll",
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

      if (chatBox) scrollToBottom(chatBox);

      updateStatusUI();
      enableRetryButton(false);
      appendUI("✅ 讀檔完成！繼續加油～", "mud-ai mud-system", false);
    } catch (err) {
      appendUI("❌ 讀檔失敗，請確認檔案格式正確。", "mud-ai mud-system", false);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
};

/* =========================
   Controls
   ========================= */
window.stopRequest = function () {
  if (currentAbortController) {
    try { currentAbortController.abort(); } catch (e) {}
  }
};

window.retryLastMessage = function () {
  if (!lastUserMessageText) return;
  const input = document.getElementById("userInput");
  if (input) input.value = lastUserMessageText;
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
  appendUI("💬 新對話已開始。你可以在下方輸入一句話。", "mud-ai mud-system", false);
  if (chat) scrollToBottom(chat);
};

window.toggleHelpModal = function () {
  const modal = document.getElementById("helpModal");
  if (!modal) return;
  modal.style.display = modal.style.display === "flex" ? "none" : "flex";
};

/* =========================
   History pruning
   ========================= */
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

/* =========================
   Text cleanup + action parsing
   ========================= */
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
  try {
    if (typeof action.confdelta === "number") gameState.confidence += action.confdelta;
    if (typeof action.fludelta === "number") gameState.fluency += action.fludelta;
    if (typeof action.leveldelta === "number") gameState.level += action.leveldelta;

    if (action.location && String(action.location).trim())
      gameState.location = String(action.location).trim();

    if (action.vocabadded) {
      String(action.vocabadded).split(",").forEach(w => {
        const t = w.trim();
        if (t && !gameState.vocabulary.includes(t)) gameState.vocabulary.push(t);
      });
    }
  } catch (e) {
    console.warn("Action apply error", e);
  }
  updateStatusUI();
}

/* =========================
   Errors
   ========================= */
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

/* =========================
   Gemini native
   ========================= */
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

/* =========================
   Requests
   ========================= */
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

/* =========================
   Send
   ========================= */
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

  appendUI(text, "mud-user");
  input.value = "";

  const loader = document.getElementById("mudLoading");
  if (loader) loader.style.display = "block";

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

          // Typewriter effect (smart scroll)
          const b = document.getElementById("mudChatBox");
          const d = document.createElement("div");
          d.className = "mud-msg mud-ai";
          b.insertBefore(d, document.getElementById("mudLoading"));

          let i = 0;
          let stickToBottom = isNearBottom(b);

          function maybeStick() {
            if (!stickToBottom) return;
            if (!isNearBottom(b, 260)) {
              stickToBottom = false;
              return;
            }
            scrollToBottom(b);
          }

          function typeWriter() {
            if (i < cleanMsg.length) {
              d.textContent = cleanMsg.substring(0, i + 1);
              i++;
              maybeStick();
              setTimeout(typeWriter, 10);
            } else {
              d.innerHTML = marked.parse(cleanMsg);
              maybeStick();
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

/* =========================
   Keyboard
   ========================= */
window.handleKeyPress = function (e) {
  if (e.key === "Enter" && !e.shiftKey && !document.getElementById("sendBtn").disabled) {
    sendMessage();
  }
};

/* =========================
   Init
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  loadConfig();
  updateStatusUI();

  messageHistory = [{ role: "system", content: buildSystemPrompt() }];

  appendUI(
    "在下方輸入一句話就可以開始。你可以試試：『我想點一杯 Teh Tarik！』",
    "mud-ai mud-system",
    false
  );

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    try { closeRightPanel(); } catch(e) {}
    setShellClass("settings-collapsed", true);
    localStorage.setItem("mud_settings_open", "0");
  });

  window.addEventListener("resize", () => {
    const overlay = document.getElementById("panelOverlay");
    if (!overlay) return;
    if (isMobileMode() && isShellClass("sidebar-open")) overlay.style.display = "block";
    else overlay.style.display = "none";
  });
});
