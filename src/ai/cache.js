const PREFIX = 'kawan-ai:';
const INTERVAL_MS = 2500;
let lastRequest = 0;
function storage() { try { return globalThis.localStorage; } catch { return null; } }
export function getCached(key) { try { const raw = storage()?.getItem(PREFIX + key); return raw ? JSON.parse(raw) : null; } catch { return null; } }
export function setCached(key, value) { try { storage()?.setItem(PREFIX + key, JSON.stringify(value)); } catch {} }
export function clearCache() { try { const s = storage(); if (s) for (let i = s.length - 1; i >= 0; i--) { const key = s.key(i); if (key?.startsWith(PREFIX)) s.removeItem(key); } } catch {} }
export function waitForRequestInterval(now = Date.now()) { const wait = Math.max(0, INTERVAL_MS - (now - lastRequest)); lastRequest = now + wait; return new Promise((resolve) => setTimeout(resolve, wait)); }
export const CACHE_INTERVAL_MS = INTERVAL_MS;
