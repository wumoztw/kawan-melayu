// Frontend now calls FastAPI backend to prevent action/code leakage.
if (window.marked) marked.setOptions({ breaks: true, gfm: true });

let gameState = {
  confidence: 100,
  fluency: 0,
  level: 1,
  location: "Mamak Stall",
  vocabulary: []
};

let messageHistory = []; // keep minimal history for better context
let lastRequestTime = 0;
const THROTTLE_LIMIT = 800; // backend already guards; keep UI snappy

let lastUserMessageText = "";

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
  // Backend mode uses fetch; browser AbortController could be added later.
};

window.retryLastMessage = function () {
  if (!lastUserMessageText) return;
  const input = document.getElementById("userInput");
  if (input) input.value = lastUserMessageText;
  sendMessage(true);
};

window.clearChat = function () {
  messageHistory = [];
  const chat = document.getElementById("mudChatBox");
  if (chat) chat.innerHTML = `<div class="mud-loading" id="mudLoading" style="display:none">AI 思考中...</div>`;
  enableRetryButton(false);
};

function saveStateFromBackend(state) {
  if (!state) return;
  gameState = {
    confidence: state.confidence ?? gameState.confidence,
    fluency: state.fluency ?? gameState.fluency,
    level: state.level ?? gameState.level,
    location: state.location ?? gameState.location,
    vocabulary: Array.isArray(state.vocabulary) ? state.vocabulary : gameState.vocabulary
  };
  updateStatusUI();
}

window.saveConfig = function () {
  const providerKey = document.getElementById("apiProvider").value;
  const apiKey = document.getElementById("apiKey").value.trim();
  const selectedModel = document.getElementById("modelSelect").value;

  localStorage.setItem("mudapiprovider", providerKey);
  localStorage.setItem("mudselectedmodel", selectedModel);

  // NOTE: In backend mode, apiKey is optional (prefer env on server).
  if (apiKey) localStorage.setItem("mudapikey" + providerKey, apiKey);
};

window.handleProviderChange = function () {
  const providerKey = document.getElementById("apiProvider").value;
  const modelSelect = document.getElementById("modelSelect");
  const apiKeyInput = document.getElementById("apiKey");

  // Keep the old UI models list (frontend-only). Backend will pass through.
  const providerModels = {
    openrouter: [
      { id: "auto", name: "Auto" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
      { id: "deepseek/deepseek-r1-distill-llama-70b:free", name: "DeepSeek R1 (Free)" }
    ],
    groq: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" }
    ],
    gemini: [
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash" }
    ],
    openai: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "o1-mini", name: "o1 Mini" }
    ]
  };

  const models = providerModels[providerKey] || [{ id: "auto", name: "Auto" }];
  modelSelect.innerHTML = models.map(m => `<option value="${m.id}">${m.name}</option>`).join("");

  const savedKey = localStorage.getItem("mudapikey" + providerKey);
  apiKeyInput.value = savedKey || "";

  const savedModel = localStorage.getItem("mudselectedmodel");
  if (savedModel && models.some(m => m.id === savedModel)) modelSelect.value = savedModel;
  else modelSelect.value = models[0].id;
};

window.updateStatusUI = function () {
  if (gameState.confidence > 100) gameState.confidence = 100;
  if (gameState.confidence < 0) gameState.confidence = 0;
  if (gameState.fluency < 0) gameState.fluency = 0;

  while (gameState.fluency >= 100) {
    gameState.level += 1;
    gameState.fluency -= 100;
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
};

async function callBackendChat({ provider, model, apiKey, userText }) {
  const payload = {
    provider,
    model,
    user_text: userText,
    history: messageHistory,
    state: gameState,
    api_key: apiKey || null
  };

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return await res.json();
}

window.sendMessage = async function (isRetry = false) {
  const providerKey = document.getElementById("apiProvider").value;
  const modelId = document.getElementById("modelSelect").value;
  const apiKey = document.getElementById("apiKey").value.trim();

  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (input.disabled || !text) return;

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

  try {
    const data = await callBackendChat({
      provider: providerKey,
      model: modelId,
      apiKey,
      userText: text
    });

    // update state from backend
    saveStateFromBackend(data.state);

    // keep minimal history (no system prompt on frontend)
    messageHistory.push({ role: "user", content: text });
    messageHistory.push({ role: "assistant", content: data.ui_text });
    if (messageHistory.length > 12) messageHistory = messageHistory.slice(messageHistory.length - 12);

    if (loader) loader.style.display = "none";

    const b = document.getElementById("mudChatBox");
    const d = document.createElement("div");
    d.className = "mud-msg mud-ai";
    b.insertBefore(d, document.getElementById("mudLoading"));

    const cleanMsg = String(data.ui_text || "");

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
  } catch (e) {
    if (loader) loader.style.display = "none";
    appendUI(String(e.message || e), "mud-ai", true);
    setBusyUI(false);
    enableRetryButton(true);
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

// Initialize
const savedProvider = localStorage.getItem("mudapiprovider") || "openrouter";
document.getElementById("apiProvider").value = savedProvider;
handleProviderChange();

document.getElementById("apiKey").value =
  localStorage.getItem("mudapikey" + savedProvider) ||
  localStorage.getItem("mudapikey") ||
  "";

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
  if (savedProvider2) {
    const providerSelect = document.getElementById("apiProvider");
    if (providerSelect) providerSelect.value = savedProvider2;
    handleProviderChange();
  }

  enableRetryButton(false);
});
