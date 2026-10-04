import { STATE_VERSION, normalizeState } from './state.js';
export const SAVE_KEY = 'kawan:save';
export function validateSave(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, error: 'Save must be an object' };
  if (value.version != null && (!Number.isInteger(value.version) || value.version > STATE_VERSION || value.version < 1)) return { valid: false, error: 'Unsupported save version' };
  return { valid: true, state: migrateSave(value) };
}
export function migrateSave(value) { return normalizeState({ ...value, version: STATE_VERSION }); }
export function saveToStorage(state, storage = globalThis.localStorage, key = SAVE_KEY) {
  if (!storage) throw new Error('localStorage unavailable');
  storage.setItem(key.startsWith('kawan:') ? key : `kawan:${key}`, JSON.stringify({ ...state, version: STATE_VERSION }));
}
export function loadFromStorage(storage = globalThis.localStorage, key = SAVE_KEY) {
  if (!storage) return null;
  const raw = storage.getItem(key.startsWith('kawan:') ? key : `kawan:${key}`);
  if (!raw) return null;
  try { const result = validateSave(JSON.parse(raw)); return result.valid ? result.state : null; } catch { return null; }
}
export function exportSave(state, options = {}) {
  const exported = structuredClone(state);
  if (options.includeSecrets !== true) for (const key of Object.keys(exported)) if (/secret|token|api.?key|credential/i.test(key)) delete exported[key];
  exported.version = STATE_VERSION;
  return JSON.stringify(exported, null, 2);
}
export function importSave(json) {
  try { const result = validateSave(JSON.parse(json)); return result.valid ? { ...result, state: migrateSave(result.state) } : result; }
  catch (error) { return { valid: false, error: error.message }; }
}
