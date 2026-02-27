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
const THROTTLE_LIMIT = 3000;

/* ===== request control / retry / fallback ===== */
let currentAbortController = null;
let lastUserMessageText = "";
let lastProviderKeyUsed = "";
let lastModelUsed = "";

const FALLBACK_ORDER = ["openrouter", "groq", "gemini", "openai"];
const MAX_AUTO_RETRIES = 2;

// System Prompt
function buildSystemPrompt() {
  // From zero: start with Taiwan Mandarin as the main teaching language,
  // then gradually shift to Malay as the player levels up.
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
- 先輸出「台灣華語（繁中）」為主的教學引導（初期），或「馬來文」為主的對話（中後期），並依上方比例調整。
- 不管比例如何，每回合都要讓使用者看得懂你要他說哪一句。

【action 規則（非常重要）】
- action 只用來給程式讀取，不要讓使用者看到。
- action 必須放在回覆的最後一行，並且必須完全符合下列格式（大小寫與符號要一樣）：
<action>{"confdelta":0,"fludelta":10,"leveldelta":0,"location":null,"vocabadded":"Nasi Lemak"}</action>
- action 行前面不要加任何文字（例如不要加 action: 或 action\" 或任何說明）。
- 如果你無法遵守 action 格式，請輸出一個合法的空 action：
<action>{"confdelta":0,"fludelta":0,"leveldelta":0,"location":null,"vocabadded":""}</action>

【目前玩家狀態】
- 信心值 confidence=${gameState.confidence}/100
- 流利度 fluency=${gameState.fluency}/100
- 等級 level=Lv.${gameState.level}
- 地點 location=${gameState.location}
- 已學詞彙 vocabulary=${gameState.vocabulary.join(", ")}
`;
}

const PROVIDERS = {
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      { id: "auto", name: "Auto" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
      { id: "deepseek/deepseek-r1-distill-llama-70b:free", name: "DeepSeek R1 (Free)" }
    ]
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" }
    ]
  },
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: [
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash" }
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
  if (sendBtn) sendBtn.innerText = isBusy ? "..." : "送出";
  if (stopBtn) stopBtn.disabled = !isBusy;
}

function enableRetryButton(enabled) {
  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.disabled = !enabled;
}

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
  // Keep gameState, reset history and UI
  messageHistory = [{ role: "system", content: buildSystemPrompt() }];
  const chat = document.getElementById("mudChatBox");
  if (chat) chat.innerHTML = `<div class="mud-loading" id="mudLoading" style="display:none">AI 思考中...</div>`;
  enableRetryButton(false);
};

function pruneHistoryKeepRecentTurns(maxTurns = 6) {
  // keep: [system] + last maxTurns*2 messages (user+assistant)
  if (!messageHistory || messageHistory.length <= 1) return;
  const system = messageHistory[0] && messageHistory[0].role === "system"
    ? messageHistory[0]
    : { role: "system", content: buildSystemPrompt() };

  const rest = messageHistory.slice(1);
  const keepCount = Math.max(0, maxTurns * 2);
  const trimmed = rest.length > keepCount ? rest.slice(rest.length - keepCount) : rest;

  messageHistory = [system, ...trimmed];
}

function normalizeErrorMessage(err, res) {
  if (err && err.name === "AbortError") return "已停止請求。";
  if (res && res.status === 401) return "API Key 無效或未授權（401）。";
  if (res && res.status === 429) return "請求太頻繁或額度限制（429），請稍後再試或換模型/供應商。";
  if (res && res.status >= 500) return `供應商伺服器錯誤（${res.status}），稍後再試或開啟自動備援。`;
  if (err && err.message) return err.message;
  return "請求失敗，請稍後再試。";
}

function stripTrailingActionLikeLines(text) {
  if (!text) return "";
  // Repeatedly remove trailing lines that look like action payloads or tags.
  // This is intentionally aggressive to prevent leaking control data into UI.
  let t = String(text).replace(/\r\n/g, "\n");
  for (let i = 0; i < 5; i++) {
    const before = t;
    t = t
      // remove proper <action>...</action> blocks at end
      .replace(/\n?\s*<\s*action\s*>[\s\S]*?<\/\s*action\s*>\s*$/i, "")
      // remove unclosed <action>... at end
      .replace(/\n?\s*<\s*action\s*>[\s\S]*$/i, "")
      // remove lines ending with action{...} / action\"{...}
      .replace(/\n?\s*\baction\s*\"?\s*{[\s\S]*?}\s*$/i, "")
      // remove stray action tag tokens at end
      .replace(/\n?\s*<\/?\s*action\s*>\s*$/i, "")
      .trimEnd();
    if (t === before) break;
  }
  return t;
}

/* ===== Parsing improvements ===== */
function extractTextForUI(text) {
  let clean = String(text || "");

  // Remove think blocks
  clean = clean.replace(/<\s*think\s*>[\s\S]*?<\/\s*think\s*>/gi, "");

  // Remove proper action blocks anywhere
  clean = clean.replace(/<\s*action\s*>[\s\S]*?<\/\s*action\s*>/gi, "");

  // If action-like control data is appended at the end, strip it safely
  clean = stripTrailingActionLikeLines(clean);

  // Remove line-start 'action' labels that sometimes appear
  clean = clean.replace(/^\s*action\s*/gim, "");

  // Cleanup stray tags/fences
  clean = clean.replace(/<\/?action>/gi, "");
  clean = clean.replace(/```json/gi, "");
  clean = clean.replace(/```/gi, "");

  return clean.trim();
}

function tryParseActionFromText(text) {
  const t = String(text || "");

  // Priority 1: <action>{...}</action>
  let match = t.match(/<\s*action\s*>([\s\S]*?)<\/\s*action\s*>/i);
  if (match && match[1]) {
    const jsonString = match[1].replace(/```json/gi, "").replace(/```/gi, "").trim();
    try { return JSON.parse(jsonString); } catch (e) {}
  }

  // Priority 2: action\"{...}\" (malformed) or action{...}
  match = t.match(/\baction\s*\"?\s*({[\s\S]*?})/i);
  if (match && match[1]) {
    try { return JSON.parse(match[1]); } catch (e) {}
  }

  // Priority 3: first JSON object that contains any expected keys
  const candidates = t.match(/{[\s\S]*?}/g) || [];
  for (const c of candidates) {
    if (!/confdelta|fludelta|leveldelta|location|vocabadded/i.test(c)) continue;
    try { return JSON.parse(c); } catch (e) {}
  }
  return null;
}

function applyActionDeltas(text) {
  const action = tryParseActionFromText(text);
  if (action) {
    try {
      if (typeof action.confdelta === "number") gameState.confidence += action.confdelta;
      if (typeof action.fludelta === "number") gameState.fluency += action.fludelta;
      if (typeof action.leveldelta === "number") gameState.level += action.leveldelta;

      if (action.location !== undefined && action.location !== null && String(action.location).trim() !== "") {
        gameState.location = String(action.location);
      }

      if (action.vocabadded !== undefined && action.vocabadded !== null) {
        let words = String(action.vocabadded).split(",");
        words.forEach(w => {
          let trimmed = w.trim();
          if (trimmed && !gameState.vocabulary.includes(trimmed)) gameState.vocabulary.push(trimmed);
        });
      }
    } catch (e) {
      console.warn("Action apply error", e);
    }
  }

  updateStatusUI();
}

async function requestWithProvider({ providerKey, key, modelId, payloadMessages, signal }) {
  const provider = PROVIDERS[providerKey];
  let activeModel = modelId;

  if (modelId === "auto" && providerKey === "openrouter") activeModel = "meta-llama/llama-3.3-70b-instruct:free";

  const url = providerKey === "gemini" ? `${provider.baseUrl}?key=${encodeURIComponent(key)}` : provider.baseUrl;

  const headers = { "Content-Type": "application/json" };
  if (providerKey !== "gemini") headers["Authorization"] = `Bearer ${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: activeModel,
      messages: payloadMessages,
      temperature: 0.7
    }),
    signal
  });

  return { res, activeModel };
}

function getFallbackChain(primaryKey) {
  const enabled = getOptFallbackEnabled();
  if (!enabled) return [primaryKey];
  const chain = [primaryKey, ...FALLBACK_ORDER.filter(k => k !== primaryKey)];
  return chain;
}

/* ===== Main sendMessage (upgraded, minimal restructure) ===== */
window.sendMessage = async function (isRetry = false) {
  const providerKey = document.getElementById("apiProvider").value;
  const modelId = document.getElementById("modelSelect").value;

  const input = document.getElementById("userInput");
  const text = input.value.trim();

  if (input.disabled || !text) return;

  // For each provider, we read its own stored key (so fallback can work)
  const getKeyForProvider = (pk) => {
    const currentSelected = document.getElementById("apiProvider").value;
    const directInput = document.getElementById("apiKey").value.trim();
    if (pk === currentSelected && directInput) return directInput;
    return (localStorage.getItem("mudapikey" + pk) || "").trim();
  };

  const primaryKey = getKeyForProvider(providerKey);
  if (!primaryKey) {
    appendUI("請先填入 API Key（或為備援供應商也填好 Key）。", "mud-ai", true);
    return;
  }

  const now = Date.now();
  if (!isRetry && now - lastRequestTime < THROTTLE_LIMIT) return;
  lastRequestTime = now;

  // Remember last user message for retry
  lastUserMessageText = text;

  // UI lock
  setBusyUI(true);
  enableRetryButton(false);

  appendUI(text, "mud-user");
  input.value = "";

  const loader = document.getElementById("mudLoading");
  if (loader) loader.style.display = "block";

  // Ensure system message is present and up-to-date
  if (messageHistory.length === 0) messageHistory.push({ role: "system", content: buildSystemPrompt() });
  if (messageHistory[0].role === "system") messageHistory[0].content = buildSystemPrompt();

  // Push user message
  messageHistory.push({ role: "user", content: text });

  // Prune history more safely (keep system + recent turns)
  pruneHistoryKeepRecentTurns(6);

  // Clone payload
  let payloadMessages = JSON.parse(JSON.stringify(messageHistory));
  if (payloadMessages[0].role !== "system") payloadMessages[0].role = "user";
  payloadMessages[0].content = payloadMessages[0].content || "";

  // Abort controller per request
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
            // Retry only for 429/5xx; otherwise break immediately
            if ((res.status === 429 || res.status >= 500) && r < MAX_AUTO_RETRIES) {
              await new Promise(s => setTimeout(s, 400 + r * 600));
              continue;
            }
            throw { res };
          }

          const data = await res.json();
          const aiMsg = data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : "";

          if (!aiMsg) throw new Error("Empty response.");

          // Track what worked
          lastProviderKeyUsed = pk;
          lastModelUsed = out.activeModel;

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
              b.scrollTop = b.scrollHeight;
              setTimeout(typeWriter, 12);
            } else {
              d.innerHTML = marked.parse(cleanMsg);
              b.scrollTop = b.scrollHeight;
              setBusyUI(false);
              enableRetryButton(true);
              input.focus();
            }
          }
          typeWriter();

          currentAbortController = null;
          return; // success
        } catch (e) {
          if (e && e.name === "AbortError") throw e;
          lastErr = e;
          if (e && e.res && !(e.res.status === 429 || e.res.status >= 500)) break;
        }
      }
      // try next provider
    }

    throw lastErr || new Error("All providers failed.");
  } catch (e) {
    if (loader) loader.style.display = "none";

    if (e && e.name === "AbortError") {
      appendUI("已停止請求。", "mud-ai", true);
    } else if (e && e.res) {
      appendUI(normalizeErrorMessage(null, e.res), "mud-ai", true);
    } else {
      appendUI(normalizeErrorMessage(e, null), "mud-ai", true);
    }

    setBusyUI(false);
    enableRetryButton(true);

    currentAbortController = null;
  }
};

function appendUI(t, c, html = false) {
  const b = document.getElementById("mudChatBox");
  const d = document.createElement("div");
  d.className = "mud-msg " + c;
  if (html) d.innerHTML = t;
  else d.textContent = t;
  b.insertBefore(d, document.getElementById("mudLoading"));
  b.scrollTop = b.scrollHeight;
}

window.handleKeyPress = function (e) {
  if (e.key === "Enter" && !e.shiftKey && !document.getElementById("sendBtn").disabled) sendMessage();
};

window.saveGame = function () {
  const cfg = {
    provider: document.getElementById("apiProvider").value,
    model: document.getElementById("modelSelect").value,
    apiKey: document.getElementById("apiKey").value.trim(),
    optFallback: getOptFallbackEnabled(),
    optSaveKeyInFile: getOptSaveKeyInFile()
  };

  if (!getOptSaveKeyInFile()) delete cfg.apiKey;

  const data = { state: gameState, history: messageHistory, config: cfg };

  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "KawanMelayuSave.json";
  a.click();
};

window.loadGame = function (event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const d = JSON.parse(e.target.result);
      gameState = d.state;
      messageHistory = d.history;

      updateStatusUI();

      if (d.config) {
        if (d.config.provider) document.getElementById("apiProvider").value = d.config.provider;
        handleProviderChange();
        if (d.config.model) document.getElementById("modelSelect").value = d.config.model;

        if (d.config.apiKey) document.getElementById("apiKey").value = d.config.apiKey;

        const optFallback = document.getElementById("optFallback");
        const optSaveKeyInFile = document.getElementById("optSaveKeyInFile");
        if (optFallback && typeof d.config.optFallback === "boolean") optFallback.checked = d.config.optFallback;
        if (optSaveKeyInFile && typeof d.config.optSaveKeyInFile === "boolean") optSaveKeyInFile.checked = d.config.optSaveKeyInFile;

        saveConfig();
      }

      document.getElementById("mudChatBox").innerHTML =
        `<div class="mud-loading" id="mudLoading" style="display:none">AI 思考中...</div>`;

      messageHistory.forEach(m => {
        if (m.role === "user" && !m.content.includes("<action>")) appendUI(m.content, "mud-user");
        if (m.role === "assistant") appendUI(marked.parse(extractTextForUI(m.content)), "mud-ai", true);
      });

      enableRetryButton(!!lastUserMessageText);
    } catch (err) {
      alert("讀取失敗。請確認存檔格式正確。");
    }
  };

  reader.readAsText(file);
};

const savedProvider = localStorage.getItem("mudapiprovider") || "openrouter";
document.getElementById("apiProvider").value = savedProvider;
handleProviderChange();

document.getElementById("apiKey").value =
  localStorage.getItem("mudapikey" + savedProvider) ||
  localStorage.getItem("mudapikey") ||
  "";

const optFallback = document.getElementById("optFallback");
const optSaveKeyInFile = document.getElementById("optSaveKeyInFile");
if (optFallback) optFallback.checked = (localStorage.getItem("mudopt_fallback") || "0") === "1";
if (optSaveKeyInFile) optSaveKeyInFile.checked = (localStorage.getItem("mudopt_savekeyinfile") || "0") === "1";

updateStatusUI();

setTimeout(() => {
  const welcomeHtml = `<strong>歡迎來到 Kawan Melayu！</strong><br><br>這是一個從 0 開始的馬來文情境對話練習遊戲。<br>前期我會<strong>主要用台灣華語（繁中）</strong>帶你學，並用少量馬來文輔助；等你等級提升後，才會逐步改成馬來文為主。<br><br>今天先學 2 句最常用的開場：<br>1) <strong>Selamat pagi!</strong>（早安）<br>2) <strong>Jom mula!</strong>（我們開始吧）<br><br>你可以先回我：<strong>Selamat pagi!</strong>`;
  appendUI(welcomeHtml, "mud-ai", true);
}, 500);

window.toggleSidebar = function () {
  const container = document.querySelector(".mud-container");
  const isCollapsed = container.classList.toggle("sidebar-collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed);
};

document.addEventListener("DOMContentLoaded", () => {
  let savedCollapsed = localStorage.getItem("sidebarCollapsed");
  let shouldCollapse = savedCollapsed !== "false";

  const container = document.querySelector(".mud-container");
  if (shouldCollapse && container) container.classList.add("sidebar-collapsed");

  const savedProvider2 = localStorage.getItem("mudapiprovider");
  if (savedProvider2 && PROVIDERS[savedProvider2]) {
    const providerSelect = document.getElementById("apiProvider");
    if (providerSelect) providerSelect.value = savedProvider2;
    handleProviderChange();
  }

  enableRetryButton(false);
});
