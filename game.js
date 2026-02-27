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
  let levelStrategy;
  if (gameState.level <= 3) levelStrategy = "70% English, 30% Malay";
  else if (gameState.level <= 6) levelStrategy = "30% English, 70% Malay (include casual particles like 'Lah', 'Meh')";
  else levelStrategy = "100% Malay";

  return `You are a friendly Bahasa Melayu tutor.

Rules:
1. Keep responses short and practical.
2. Teach 1-2 new words max per reply.
3. Use this language ratio: ${levelStrategy}
4. Track player stats: fluency=${gameState.fluency}, level=${gameState.level}, confidence=${gameState.confidence}/100
5. At end, output an action JSON block like:
<action>{"confdelta":0,"fludelta":10,"leveldelta":0,"location":null,"vocabadded":"Nasi Lemak"}</action>

Current:
- confidence=${gameState.confidence}/100
- fluency=${gameState.fluency}/100
- level=Lv.${gameState.level}
- location=${gameState.location}
- vocabulary=${gameState.vocabulary.join(", ")}
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
  if (sendBtn) sendBtn.innerText = isBusy ? "..." : "Send";
  if (stopBtn) stopBtn.disabled = !isBusy;
}

function enableRetryButton(enabled) {
  const retryBtn = document.getElementById("retryBtn");
  if (retryBtn) retryBtn.disabled = !enabled;
}

/* ===== NEW: immersive onboarding prompt builder ===== */
function buildOnboardingHtml() {
  const provider = document.getElementById("apiProvider")?.value || "openrouter";
  const providerName = PROVIDERS[provider]?.name || provider;
  const hasKey = (document.getElementById("apiKey")?.value || "").trim().length > 0;

  const keyHint = hasKey
    ? `✅ 已偵測到 ${providerName} 的 API Key，可以直接開始。`
    : `🔑 先在上方貼上 ${providerName} 的 API Key（只會存在你的瀏覽器 localStorage）。`;

  return `
<strong>Selamat datang ke Mamak Stall!</strong><br>
你一推開油煙味的玻璃門，老闆抬頭笑：<br>
<strong>Boss, nak makan apa?</strong>（老闆：想吃什麼？）<br><br>
${keyHint}<br><br>
<b>可以直接照抄一句開局：</b><br>
1) <code>Saya mahu nasi lemak.</code>（我要椰漿飯）<br>
2) <code>Boleh tambah telur?</code>（可以加蛋嗎？）<br>
3) <code>Air teh ais satu.</code>（一杯冰奶茶）<br><br>
今天任務：學會點 <strong>Nasi Lemak</strong> 和 <strong>Roti Canai</strong>，講得越自然，<em>Fluency</em> 升得越快。<br>
<em>Jom mula!</em>`;
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
  if (chat) chat.innerHTML = `<div class="mud-loading" id="mudLoading" style="display:none">AI thinking...</div>`;
  enableRetryButton(false);

  // Optional: re-show onboarding after clear
  setTimeout(() => appendUI(buildOnboardingHtml(), "mud-ai", true), 80);
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

/* ===== Config ===== */
window.saveConfig = function () {
  const providerKey = document.getElementById("apiProvider").value;
  const apiKey = document.getElementById("apiKey").value.trim();
  const selectedModel = document.getElementById("modelSelect").value;

  localStorage.setItem("mudapiprovider", providerKey);
  localStorage.setItem("mudselectedmodel", selectedModel);

  const optFallback = document.getElementById("optFallback");
  const optSaveKeyInFile = document.getElementById("optSaveKeyInFile");
  if (optFallback) localStorage.setItem("mudopt_fallback", optFallback.checked ? "1" : "0");
  if (optSaveKeyInFile) localStorage.setItem("mudopt_savekeyinfile", optSaveKeyInFile.checked ? "1" : "0");

  if (apiKey) localStorage.setItem("mudapikey" + providerKey, apiKey);
};

window.handleProviderChange = function () {
  const providerKey = document.getElementById("apiProvider").value;
  const modelSelect = document.getElementById("modelSelect");
  const apiKeyInput = document.getElementById("apiKey");

  const provider = PROVIDERS[providerKey];
  modelSelect.innerHTML = provider.models.map(m => `<option value="${m.id}">${m.name}</option>`).join("");

  const savedKey = localStorage.getItem("mudapikey" + providerKey);
  apiKeyInput.value = savedKey || "";

  const savedModel = localStorage.getItem("mudselectedmodel");
  if (savedModel && provider.models.some(m => m.id === savedModel)) modelSelect.value = savedModel;
  else modelSelect.value = provider.models[0].id;
};

window.updateStatusUI = function () {
  if (gameState.confidence > 100) gameState.confidence = 100;
  if (gameState.confidence < 0) gameState.confidence = 0;
  if (gameState.fluency < 0) gameState.fluency = 0;

  if (gameState.fluency >= 100) {
    gameState.level += 1;
    gameState.fluency = gameState.fluency - 100;
  }

  document.getElementById("hpVal").innerText = gameState.confidence;
  document.getElementById("enVal").innerText = gameState.fluency;
  document.getElementById("levelVal").innerText = `Lv. ${gameState.level}`;
  document.getElementById("locVal").innerText = gameState.location;

  document.getElementById("hpBar").style.width = `${gameState.confidence}%`;
  document.getElementById("enBar").style.width = `${gameState.fluency}%`;

  const invList = document.getElementById("inventoryList");
  if (gameState.vocabulary.length > 0) {
    invList.innerHTML = gameState.vocabulary.map(item => `<div class="vocab-item">${item}</div>`).join("");
  } else invList.innerHTML = "";

  if (messageHistory.length > 0 && messageHistory[0].role === "system") {
    messageHistory[0].content = buildSystemPrompt();
  }
};

if (messageHistory.length === 0) messageHistory.push({ role: "system", content: buildSystemPrompt() });

if (gameState.confidence <= 0) {
  appendUI("Game Over.", "mud-ai", true);
  document.getElementById("sendBtn").disabled = true;
  document.getElementById("userInput").disabled = true;
}

/* ===== Parsing ===== */
function extractTextForUI(text) {
  let clean = text;

  clean = clean.replace(/<\s*think\s*>[\s\S]*?<\/\s*think\s*>/gi, "");
  clean = clean.replace(/<\s*action\s*>[\s\S]*?<\/\s*action\s*>/gi, "");

  clean = clean.replace(/<\/?action>/gi, "");
  clean = clean.replace(/```json/gi, "");
  clean = clean.replace(/```/gi, "");

  return clean.trim();
}

function tryParseActionFromText(text) {
  let match = text.match(/<\s*action\s*>([\s\S]*?)<\/\s*action\s*>/i);
  if (match && match[1]) {
    const jsonString = match[1].replace(/```json/gi, "").replace(/```/gi, "").trim();
    try { return JSON.parse(jsonString); } catch (e) {}
  }

  const candidates = text.match(/{[\s\S]*?}/g) || [];
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

/* ===== Main sendMessage ===== */
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

  // ===== MODIFIED: show immersive onboarding if missing key =====
  if (!primaryKey) {
    appendUI(buildOnboardingHtml(), "mud-ai", true);
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
  loader.style.display = "block";

  if (messageHistory.length === 0) messageHistory.push({ role: "system", content: buildSystemPrompt() });
  if (messageHistory[0].role === "system") messageHistory[0].content = buildSystemPrompt();

  messageHistory.push({ role: "user", content: text });
  pruneHistoryKeepRecentTurns(6);

  let payloadMessages = JSON.parse(JSON.stringify(messageHistory));
  if (payloadMessages[0].role !== "system") payloadMessages[0].role = "user";
  payloadMessages[0].content = payloadMessages[0].content || "";

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

          lastProviderKeyUsed = pk;
          lastModelUsed = out.activeModel;

          applyActionDeltas(aiMsg);

          const cleanMsg = extractTextForUI(aiMsg);

          messageHistory.push({ role: "assistant", content: aiMsg });
          pruneHistoryKeepRecentTurns(6);

          loader.style.display = "none";

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
          return;
        } catch (e) {
          if (e && e.name === "AbortError") throw e;
          lastErr = e;
          if (e && e.res && !(e.res.status === 429 || e.res.status >= 500)) break;
        }
      }
    }

    throw lastErr || new Error("All providers failed.");
  } catch (e) {
    loader.style.display = "none";

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
        `<div class="mud-loading" id="mudLoading" style="display:none">AI thinking...</div>`;

      messageHistory.forEach(m => {
        if (m.role === "user" && !m.content.includes("<action>")) appendUI(m.content, "mud-user");
        if (m.role === "assistant") appendUI(marked.parse(extractTextForUI(m.content)), "mud-ai", true);
      });

      enableRetryButton(!!lastUserMessageText);

      // Optional: show onboarding after load if no key
      const providerKey = document.getElementById("apiProvider").value;
      const k = (localStorage.getItem("mudapikey" + providerKey) || document.getElementById("apiKey").value || "").trim();
      if (!k) setTimeout(() => appendUI(buildOnboardingHtml(), "mud-ai", true), 120);
    } catch (err) {
      alert("Load failed.");
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

/* ===== MODIFIED: opening message uses the same immersive onboarding ===== */
setTimeout(() => {
  appendUI(buildOnboardingHtml(), "mud-ai", true);
}, 500);

/* Sidebar toggle: new behavior + old compatibility for optional .vocab-toggle-btn text */
window.toggleSidebar = function () {
  const container = document.querySelector(".mud-container");
  const isCollapsed = container.classList.toggle("sidebar-collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed);

  const btn = document.querySelector(".vocab-toggle-btn");
  if (btn) btn.innerText = isCollapsed ? "📖" : "✖";
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
