const fs = require('fs');

// Ensure structuredClone is available in Node environment
if (typeof global.structuredClone !== 'function') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Helper to create a functional mock DOM element
function createMockElement(tagName = 'div', id = '') {
  const children = [];
  const classSet = new Set();
  const attributes = {};
  
  const element = {
    tagName: tagName.toUpperCase(),
    id,
    value: '',
    disabled: false,
    checked: false,
    innerHTML: '',
    innerText: '',
    textContent: '',
    style: {
      display: '',
      width: '',
      setProperty: (prop, val) => { element.style[prop] = val; }
    },
    dataset: {},
    options: [
      { value: 'auto', name: 'Auto' },
      { value: 'openrouter', name: 'OpenRouter' },
      { value: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 Free' },
      { value: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
    ],
    classList: {
      add: (...cls) => cls.forEach(c => classSet.add(c)),
      remove: (...cls) => cls.forEach(c => classSet.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          classSet.has(c) ? classSet.delete(c) : classSet.add(c);
        } else if (force) {
          classSet.add(c);
        } else {
          classSet.delete(c);
        }
      },
      contains: (c) => classSet.has(c)
    },
    setAttribute: (attr, val) => { attributes[attr] = String(val); },
    getAttribute: (attr) => attributes[attr] || null,
    removeAttribute: (attr) => { delete attributes[attr]; },
    appendChild: (child) => {
      children.push(child);
      element.lastElementChild = child;
      if (children.length === 1) element.firstElementChild = child;
      return child;
    },
    removeChild: (child) => {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
      element.lastElementChild = children[children.length - 1] || null;
      element.firstElementChild = children[0] || null;
      return child;
    },
    insertBefore: (newChild, refChild) => {
      const idx = children.indexOf(refChild);
      if (idx !== -1) children.splice(idx, 0, newChild);
      else children.push(newChild);
      element.lastElementChild = children[children.length - 1] || null;
      element.firstElementChild = children[0] || null;
      return newChild;
    },
    lastElementChild: null,
    firstElementChild: null,
    get children() { return children; },
    get childElementCount() { return children.length; },
    getBoundingClientRect: () => ({ height: 50, width: 200, top: 0, bottom: 50, left: 0, right: 200 }),
    addEventListener: () => {},
    removeEventListener: () => {},
    focus: () => {},
    blur: () => {},
    click: () => {},
    scrollIntoView: () => {},
    scrollTo: () => {}
  };

  return element;
}

const mockElementsMap = new Map();
function getOrCreateMockElement(id) {
  if (!mockElementsMap.has(id)) {
    mockElementsMap.set(id, createMockElement('div', id));
  }
  return mockElementsMap.get(id);
}

// Global DOM & Browser Simulation
global.document = {
  documentElement: createMockElement('html', 'html'),
  getElementById: (id) => getOrCreateMockElement(id),
  querySelector: (sel) => createMockElement('div'),
  querySelectorAll: (sel) => [createMockElement('div')],
  createElement: (tag) => createMockElement(tag),
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.window = {
  location: {},
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  matchMedia: () => ({ matches: false }),
  speechSynthesis: { cancel: () => {}, speak: () => {} },
  SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  fetch: async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: "Salam! Apa khabar?" } }] })
  }),
  alert: () => {}
};

global.localStorage = global.window.localStorage;
global.DOMPurify = { sanitize: (s) => s };
global.marked = { parse: (s) => s, setOptions: () => {} };
global.navigator = {};
global.Blob = class { constructor(content, opts) { this.content = content; this.opts = opts; } };
global.URL = { createObjectURL: () => "blob:test", revokeObjectURL: () => {} };
global.AbortController = class {
  constructor() { this.signal = { aborted: false }; }
  abort() { this.signal.aborted = true; }
};

try {
  // Read and execute game.js in the context of global.window
  const gameJs = fs.readFileSync('game.js', 'utf8');
  // Use a Function constructor to execute gameJs in the desired context,
  // effectively making top-level declarations part of `window`.
  const exposed = `
    const fns = {
      extractTextForUI,
      tryParseActionFromText,
      normalizeErrorMessage,
      rollbackTurn,
      updateStatusUI,
      applyActionDeltas,
      saveGame: window.saveGame || saveGameState,
      loadGame: window.loadGame || loadGameState,
      loadGameState,
      saveGameState
    };
    Object.assign(window, fns);
    Object.assign(global, fns);
  `;
  const gameModule = new Function('window', 'global', gameJs.replace(/\blet gameState\b/, 'window.gameState') + exposed);
  gameModule(global.window, global);

  // Expose gameState globally for direct test access (for now)
  global.gameState = global.window.gameState;

  console.log("--- Running Smoke Tests ---");

  // Test 1: Verify critical functions exist
  const requiredFns = [
    'extractTextForUI', 'tryParseActionFromText',
    'normalizeErrorMessage'
  ];
  const windowFns = ['saveGame', 'loadGame', 'clearChat', 'sendMessage', 'toggleRightPanel', 'openRightPanel', 'closeRightPanel', 'toggleSettingsDrawer', 'handleProviderChange', 'saveConfig', 'stopRequest', 'retryLastMessage', 'clearChat', 'toggleHelpModal', 'handleKeyPress'];
  for (const fn of requiredFns) {
    if (typeof global.window[fn] !== 'function') {
      throw new Error(`Critical window function missing: ${fn}`);
    }
  }
  for (const fn of windowFns) {
    if (typeof global.window[fn] !== 'function') {
      throw new Error(`Critical window function missing: ${fn}`);
    }
  }
  console.log("✓ Test 1: Critical functions verification passed");

  // Test 2: Successful rollbackTurn with valid and missing/undefined vocabulary
  try {
    const snapshotValid = {
      gameState: { confidence: 80, fluency: 50, level: 2, location: "Mamak", vocabulary: undefined, mission: null },
      historyLen: 0
    };
    rollbackTurn(snapshotValid);
    if (!Array.isArray(gameState.vocabulary)) {
      throw new Error("gameState.vocabulary is not an array after rollbackTurn");
    }
    if (gameState.confidence !== 80 || gameState.level !== 2) {
      throw new Error("gameState properties not correctly restored in rollbackTurn");
    }
    console.log("✓ Test 2: Successful rollbackTurn with undefined vocabulary passed");
  } catch (err) {
    throw new Error("Test 2 failed: " + err.message);
  }

  // Test 3: Failure handling / edge cases in rollbackTurn
  try {
    rollbackTurn(null);
    rollbackTurn(undefined);
    rollbackTurn({});
    rollbackTurn({ gameState: null });
    console.log("✓ Test 3: Failure and edge-case calls to rollbackTurn handled gracefully");
  } catch (err) {
    throw new Error("Test 3 failed: " + err.message);
  }

  // Test 4: updateStatusUI with invalid / null / undefined / non-array vocabulary
  try {
    gameState.vocabulary = null;
    updateStatusUI();
    if (!Array.isArray(gameState.vocabulary)) gameState.vocabulary = [];

    gameState.vocabulary = "not-an-array";
    updateStatusUI();
    if (!Array.isArray(gameState.vocabulary)) gameState.vocabulary = [];

    gameState.vocabulary = undefined;
    updateStatusUI();
    if (!Array.isArray(gameState.vocabulary)) gameState.vocabulary = [];

    gameState.vocabulary = [{ ms: "Terima kasih", zh: "謝謝" }, "Nasi Lemak"];
    updateStatusUI();

    console.log("✓ Test 4: updateStatusUI with various vocabulary formats handled successfully");
  } catch (err) {
    throw new Error("Test 4 failed: " + err.message);
  }

  // Test 5: Action parsing & deltas apply test
  try {
    gameState.confidence = 50;
    gameState.fluency = 50;
    gameState.vocabulary = [];

    const actionText = `<action>{"confdelta":5,"fludelta":10,"leveldelta":0,"vocabadded":"Roti Canai, Teh Tarik"}</action>`;
    console.log("DEBUG: Before applyActionDeltas, confidence=" + gameState.confidence + ", fluency=" + gameState.fluency);
    applyActionDeltas(actionText);
    console.log("DEBUG: After applyActionDeltas, confidence=" + gameState.confidence + ", fluency=" + gameState.fluency);

    if (gameState.confidence !== 55) throw new Error(`Expected confidence 55, got ${gameState.confidence}`);
    if (gameState.fluency !== 60) throw new Error(`Expected fluency 60, got ${gameState.fluency}`);
    if (!gameState.vocabulary.includes("Roti Canai") || !gameState.vocabulary.includes("Teh Tarik")) {
      throw new Error("vocabadded failed to push new vocabulary");
    }

    // Invalid action text test (failure call)
    applyActionDeltas("invalid json action text");
    applyActionDeltas(null);
    applyActionDeltas("");

    console.log("✓ Test 5: applyActionDeltas success and failure cases passed");
  } catch (err) {
    throw new Error("Test 5 failed: " + err.message);
  }

  // Test 6: Error normalization testing
  try {
    if (normalizeErrorMessage(null, { status: 401 }) !== "❌ API Key 無效或未授權（401）。") throw new Error("401 msg mismatch");
    if (normalizeErrorMessage(null, { status: 429 }) !== "⏳ 請求太頻繁或額度已滿（429），請稍後再試。") throw new Error("429 msg mismatch");
    if (normalizeErrorMessage({ name: "AbortError" }) !== "⏹ 已停止請求。") throw new Error("AbortError msg mismatch");
    console.log("✓ Test 6: Error normalization handling passed");
  } catch (err) {
    throw new Error("Test 6 failed: " + err.message);
  }

  // Test 7: loadGameState with invalid / null / undefined / non-array vocabulary
  try {
    global.localStorage.clear();
    // Simulate non-array vocabulary in localStorage
    global.localStorage.setItem("mud_autosave", JSON.stringify({
      gameState: { confidence: 70, fluency: 40, level: 3, vocabulary: "not-an-array-string" },
      history: []
    }));
    loadGameState();
    if (!Array.isArray(gameState.vocabulary)) {
      throw new Error("loadGameState failed to convert non-array vocabulary to array");
    }
    if (gameState.vocabulary.length !== 0) {
      throw new Error("loadGameState did not reset non-array vocabulary to empty array");
    }

    global.localStorage.clear();
    global.localStorage.setItem("mud_autosave", JSON.stringify({
      gameState: { confidence: 70, fluency: 40, level: 3, vocabulary: null },
      history: []
    }));
    loadGameState();
    if (!Array.isArray(gameState.vocabulary)) {
      throw new Error("loadGameState failed to convert null vocabulary to array");
    }

    console.log("✓ Test 7: loadGameState with various vocabulary formats handled successfully");
  } catch (err) {
    throw new Error("Test 7 failed: " + err.message);
  }

  console.log("smoke_test: 100% Passed successfully.");
} catch (e) {
  console.error("smoke_test: Failed", e);
  process.exit(1);
}
