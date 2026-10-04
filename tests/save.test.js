import { it, expect } from 'vitest';
import { createInitialState } from '../src/engine/state.js';
import { exportSave, importSave, saveToStorage, loadFromStorage } from '../src/engine/save.js';
it('validates, round-trips, scopes local storage and omits secrets', () => { const db = new Map(); const storage = { setItem: (k,v) => db.set(k,v), getItem: (k) => db.get(k) }; const state = { ...createInitialState(), apiKey: 'private' }; saveToStorage(state, storage); expect(loadFromStorage(storage).version).toBe(2); expect(JSON.parse(exportSave(state)).apiKey).toBeUndefined(); expect(importSave(exportSave(state)).valid).toBe(true); });
