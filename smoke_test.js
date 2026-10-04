const fs = require('fs');

// Mock browser globals
global.document = {
    getElementById: () => ({
        value: "",
        disabled: false,
        classList: { toggle: () => {}, contains: () => false, add: () => {}, remove: () => {} },
        setAttribute: () => {},
        innerHTML: "",
        style: {}
    }),
    createElement: () => ({ style: {}, classList: {} }),
    addEventListener: () => {}
};
global.window = {
    location: {},
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    matchMedia: () => ({ matches: false }),
    speechSynthesis: { cancel: () => {}, speak: () => {} },
    SpeechSynthesisUtterance: class {},
    marked: { setOptions: () => {} },
    alert: () => {}
};
global.localStorage = global.window.localStorage;
global.DOMPurify = { sanitize: (s) => s };
global.marked = { parse: (s) => s, setOptions: () => {} };
global.navigator = {};
global.Blob = class {};
global.URL = { createObjectURL: () => "", revokeObjectURL: () => {} };

try {
    // Read and execute game.js
    const gameJs = fs.readFileSync('game.js', 'utf8');
    eval(gameJs);

    // Verify critical functions exist
    if (typeof getFallbackChain !== 'function') throw new Error("getFallbackChain missing");
    
    // Verify rollbackTurn
    const snapshot = { gameState: {}, historyLen: 0 };
    rollbackTurn(snapshot);
    console.log("smoke_test: rollbackTurn passed");

    console.log("smoke_test: All checks passed.");
} catch (e) {
    console.error("smoke_test: Failed", e);
    process.exit(1);
}
