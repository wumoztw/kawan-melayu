(function () {
    if (window.marked) {
        marked.setOptions({ breaks: true, gfm: true });
    }

    // 遊戲狀態初始化
    let gameState = {
        confidence: 100,
        fluency: 0,
        level: 1,
        location: "吉隆坡街頭的嘛嘛檔 (Mamak Stall)",
        vocabulary: []
    };
    let messageHistory = [];
    let lastRequestTime = 0;
    const THROTTLE_LIMIT = 3000;

    // 動態組合 System Prompt
    function buildSystemPrompt() {
        let levelStrategy = "";
        if (gameState.level <= 3) {
            levelStrategy = "【教學策略: 初階】使用 70% 中文 / 30% 馬來文。專注於基礎名詞（如食物、數字）與短句。玩家答錯時給予高度鼓勵，清楚解釋正確拼法。";
        } else if (gameState.level <= 6) {
            levelStrategy = "【教學策略: 中階】使用 30% 中文 / 70% 馬來文。開始要求玩家用完整的馬來文句子回答（如 Saya mahu...），引入大馬口語（如 Lah, Meh）。";
        } else {
            levelStrategy = "【教學策略: 進階沉浸式】使用 100% 馬來文。扮演真實的在地人，語氣自然道地。只有在玩家主動求救（聽不懂）時才提供中文翻譯。";
        }

        return `你是一位友善、熱情的馬來西亞在地嚮導兼語言家教。你正在陪伴玩家進行一場文字冒險，目標是教會玩家實用的馬來西亞語（Bahasa Melayu）。

【底層設計準則】
1. 你的回應必須融入情境對話（例如：你是嘛嘛檔的老闆、Grab 司機或夜市攤販）。
2. 每次對話，請在劇情中教玩家 1~2 個實用的馬來文單字或句子，並給予情境測驗要求玩家回答。
3. ${levelStrategy}
4. 動態評估：如果玩家答對，增加流暢度(flu_delta)。如果玩家表現優異或流暢度累積足夠，請給予升級(level_delta)。答錯時扣除自信心(conf_delta)；若玩家正確回答或表現優異，也可適度給予自信心獎勵（增加 conf_delta，上限 100）。
5. 回應格式：絕對嚴格在回覆的最後獨立一行，使用標準的 <action> 標籤包覆 JSON 來表示「數值變動」。
格式範例：
<action>{"conf_delta": 0, "flu_delta": 10, "level_delta": 0, "location": "新地點(若無請填 null)", "vocab_added": "Nasi Lemak (椰漿飯)"}</action>

【核心記憶區】
玩家狀態: 自信心 ${gameState.confidence}/100, 流暢度 ${gameState.fluency}/100, 等級 Lv.${gameState.level}
當前位置: ${gameState.location}
已學會單字: ${gameState.vocabulary.join(', ') || '無'}`;
    }

    const PROVIDERS = {
        openrouter: {
            name: "OpenRouter",
            baseUrl: "https://openrouter.ai/api/v1/chat/completions",
            models: [
                { id: "auto", name: "自動切換最佳模型" },
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

    window.saveConfig = function () {
        const providerKey = document.getElementById('apiProvider').value;
        const apiKey = document.getElementById('apiKey').value.trim();
        const selectedModel = document.getElementById('modelSelect').value;

        // Store general preference
        localStorage.setItem('mud_api_provider', providerKey);
        localStorage.setItem('mud_selected_model', selectedModel);

        // Store key specifically for this provider
        if (apiKey) {
            localStorage.setItem(`mud_api_key_${providerKey}`, apiKey);
        }
    };

    window.handleProviderChange = function () {
        const providerKey = document.getElementById('apiProvider').value;
        const modelSelect = document.getElementById('modelSelect');
        const apiKeyInput = document.getElementById('apiKey');
        const provider = PROVIDERS[providerKey];

        modelSelect.innerHTML = provider.models.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

        // Restore provider-specific key
        const savedKey = localStorage.getItem(`mud_api_key_${providerKey}`);
        apiKeyInput.value = savedKey || "";

        const savedModel = localStorage.getItem('mud_selected_model');
        if (savedModel && provider.models.some(m => m.id === savedModel)) {
            modelSelect.value = savedModel;
        } else {
            modelSelect.value = provider.models[0].id;
        }
    };

    window.updateStatusUI = function () {
        // ... (unchanged code)
        if (gameState.confidence > 100) gameState.confidence = 100;
        if (gameState.confidence < 0) gameState.confidence = 0;
        if (gameState.fluency < 0) gameState.fluency = 0;
        if (gameState.fluency >= 100) {
            gameState.level += 1;
            gameState.fluency -= 100;
        }

        document.getElementById('hpVal').innerText = gameState.confidence;
        document.getElementById('enVal').innerText = gameState.fluency;
        document.getElementById('levelVal').innerText = `Lv. ${gameState.level} ${gameState.level >= 7 ? '在地人' : (gameState.level >= 4 ? '中階者' : '初學者')}`;
        document.getElementById('locVal').innerText = gameState.location;

        document.getElementById('hpBar').style.width = gameState.confidence + '%';
        document.getElementById('enBar').style.width = gameState.fluency + '%';

        const invList = document.getElementById('inventoryList');
        if (gameState.vocabulary.length > 0) {
            invList.innerHTML = gameState.vocabulary.map(item => `<div class="vocab-item">${item}</div>`).join('');
        } else {
            invList.innerHTML = '(目前還沒有單字，趕快開口吧！)';
        }

        if (messageHistory.length > 0 && messageHistory[0].role === 'system') {
            messageHistory[0].content = buildSystemPrompt();
        }

        if (gameState.confidence <= 0) {
            appendUI("[系統通知：你的自信心已歸零！別灰心，語言學習需要耐心。請重新載入網頁再次挑戰！]", 'mud-ai', true);
            document.getElementById('sendBtn').disabled = true;
            document.getElementById('userInput').disabled = true;
        }
    };

    function extractTextForUI(text) {
        let clean = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
        clean = clean.replace(/<action>[\s\S]*?<\/action>/gi, '');
        clean = clean.replace(/```json/gi, '').replace(/```/gi, '');
        return clean.trim();
    }

    function applyActionDeltas(text) {
        let match = text.match(/<action>([\s\S]*?)<\/action>/i);
        if (match) {
            try {
                let jsonString = match[1].replace(/```json/gi, '').replace(/```/gi, '').trim();
                let action = JSON.parse(jsonString);

                if (typeof action.conf_delta === 'number') gameState.confidence += action.conf_delta;
                if (typeof action.flu_delta === 'number') gameState.fluency += action.flu_delta;
                if (typeof action.level_delta === 'number') gameState.level += action.level_delta;
                if (action.location && action.location !== "null") gameState.location = action.location;
                if (action.vocab_added && action.vocab_added !== "null" && !gameState.vocabulary.includes(action.vocab_added)) {
                    gameState.vocabulary.push(action.vocab_added);
                }
            } catch (e) {
                console.warn("JSON 格式解析錯誤，略過數值變更", e);
            }
        }
        updateStatusUI();
    }

    window.sendMessage = async function () {
        const key = document.getElementById('apiKey').value.trim();
        const providerKey = document.getElementById('apiProvider').value;
        const modelId = document.getElementById('modelSelect').value;
        const input = document.getElementById('userInput');
        const sendBtn = document.getElementById('sendBtn');
        const text = input.value.trim();

        if (input.disabled || !text) return;

        if (!key) {
            appendUI(`[系統提示：請先在上方輸入 API Key 才能開始連線喔！]`, 'mud-ai', true);
            return;
        }

        const now = Date.now();
        if (now - lastRequestTime < THROTTLE_LIMIT) return;
        lastRequestTime = now;

        input.disabled = true;
        sendBtn.disabled = true;
        sendBtn.innerText = '思考中...';

        appendUI(text, 'mud-user');
        input.value = '';

        const loader = document.getElementById('mudLoading');
        loader.style.display = 'block';

        if (messageHistory.length === 0) {
            messageHistory.push({ role: "system", content: buildSystemPrompt() });
        }

        messageHistory.push({ role: "user", content: text });

        let payloadMessages = JSON.parse(JSON.stringify(messageHistory));
        if (payloadMessages[0].role === 'system') {
            payloadMessages[0].role = 'user';
            payloadMessages[0].content = "[系統底層設定]\n" + payloadMessages[0].content;
        }

        const provider = PROVIDERS[providerKey];
        let activeModel = modelId;
        if (modelId === 'auto' && providerKey === 'openrouter') {
            activeModel = 'meta-llama/llama-3.3-70b-instruct:free';
        }

        try {
            const url = providerKey === 'gemini' ? `${provider.baseUrl}?key=${key}` : provider.baseUrl;
            const headers = { "Content-Type": "application/json" };
            if (providerKey !== 'gemini') {
                headers["Authorization"] = `Bearer ${key}`;
            }

            let res = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ model: activeModel, messages: payloadMessages, temperature: 0.7 })
            });

            if (!res.ok) throw new Error(`連線錯誤 (${res.status})，請稍後再試。`);

            const data = await res.json();
            const aiMsg = data.choices[0].message.content;

            applyActionDeltas(aiMsg);
            const cleanMsg = extractTextForUI(aiMsg);

            messageHistory.push({ role: "assistant", content: aiMsg });

            if (messageHistory.length > 7) messageHistory.splice(1, 2);

            loader.style.display = 'none';

            const b = document.getElementById('mudChatBox');
            const d = document.createElement('div');
            d.className = `mud-msg mud-ai`;
            b.insertBefore(d, document.getElementById('mudLoading'));

            let i = 0;
            function typeWriter() {
                if (i < cleanMsg.length) {
                    d.textContent = cleanMsg.substring(0, i + 1) + '▌';
                    i++;
                    b.scrollTop = b.scrollHeight;
                    setTimeout(typeWriter, 15);
                } else {
                    d.innerHTML = marked.parse(cleanMsg);
                    b.scrollTop = b.scrollHeight;
                    input.disabled = false;
                    sendBtn.disabled = false;
                    sendBtn.innerText = '發送';
                    input.focus();
                }
            }
            typeWriter();

        } catch (e) {
            loader.style.display = 'none';
            appendUI(`[連線異常：${e.message}]`, 'mud-ai', true);
            messageHistory.pop();
            input.disabled = false;
            sendBtn.disabled = false;
            sendBtn.innerText = '發送';
        }
    };

    function appendUI(t, c, html = false) {
        const b = document.getElementById('mudChatBox');
        const d = document.createElement('div');
        d.className = `mud-msg ${c}`;
        html ? d.innerHTML = t : d.textContent = t;
        b.insertBefore(d, document.getElementById('mudLoading'));
        b.scrollTop = b.scrollHeight;
    }

    window.handleKeyPress = (e) => {
        if (e.key === 'Enter' && !document.getElementById('sendBtn').disabled) sendMessage();
    };

    window.saveGame = function () {
        const data = {
            state: gameState,
            history: messageHistory,
            config: {
                provider: document.getElementById('apiProvider').value,
                model: document.getElementById('modelSelect').value,
                apiKey: document.getElementById('apiKey').value.trim()
            }
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `KawanMelayu_Save.json`;
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

                // 確保 Provider UI 同步
                if (d.config) {
                    if (d.config.provider) document.getElementById('apiProvider').value = d.config.provider;
                    handleProviderChange();
                    if (d.config.model) document.getElementById('modelSelect').value = d.config.model;
                    if (d.config.apiKey) document.getElementById('apiKey').value = d.config.apiKey;
                    saveConfig();
                }

                document.getElementById('mudChatBox').innerHTML = '<div class="mud-loading" id="mudLoading" style="display:none;"></div>';
                messageHistory.forEach(m => {
                    if (m.role === 'user' && !m.content.includes('[系統底層設定]')) appendUI(m.content, 'mud-user');
                    if (m.role === 'assistant') appendUI(marked.parse(extractTextForUI(m.content)), 'mud-ai', true);
                });
            } catch (err) { alert("讀取失敗"); }
        };
        reader.readAsText(file);
    };

    // 載入預設設定
    const savedProvider = localStorage.getItem('mud_api_provider') || 'openrouter';
    document.getElementById('apiProvider').value = savedProvider;
    handleProviderChange(); // 這會更新模型選單並設定正確的模型

    document.getElementById('apiKey').value = localStorage.getItem('mud_api_key') || '';
    updateStatusUI();

    // 初始對話
    setTimeout(() => {
        const welcomeHtml = `
            <strong>(你聞到濃濃的咖哩與拉茶香，周圍傳來陣陣吵雜的說話聲)</strong><br><br>
            老闆熱情地走過來：「Boss! Selamat pagi! (早安) 要吃點什麼嗎？我們這裡的 <strong>Nasi Lemak (椰漿飯)</strong> 和 <strong>Roti Canai (印度煎餅)</strong> 最出名啦！」<br><br>
            <em>👉 試著用中文回答他你想要吃什麼，或是挑戰直接用拼音回覆他！</em>
        `;
        appendUI(welcomeHtml, 'mud-ai', true);
    }, 500);

    window.toggleSidebar = function () {
        const container = document.querySelector('.mud-container');
        const isCollapsed = container.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);

        // Update button text if needed
        const btn = document.querySelector('.vocab-toggle-btn');
        if (btn) {
            btn.innerText = isCollapsed ? '展開 ▶' : '收起 ◀';
        }
    };

    // Initialize sidebar and API settings state
    document.addEventListener('DOMContentLoaded', () => {
        // Restore Sidebar
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            const container = document.querySelector('.mud-container');
            if (container) container.classList.add('sidebar-collapsed');
            const btn = document.querySelector('.vocab-toggle-btn');
            if (btn) btn.innerText = '展開 ▶';
        }

        // Restore API Provider and Key
        const savedProvider = localStorage.getItem('mud_api_provider');
        if (savedProvider && PROVIDERS[savedProvider]) {
            const providerSelect = document.getElementById('apiProvider');
            if (providerSelect) {
                providerSelect.value = savedProvider;
                handleProviderChange(); // This will also restore the key for this provider
            }
        }
    });

})();
