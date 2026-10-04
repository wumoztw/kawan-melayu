export const STATE_VERSION = 2;
export const PHASES = ['BRIEFING', 'PREP', 'OPEN', 'RESTOCK', 'CLOSE'];

export function createInitialState(options = {}) {
  const cash = Number.isFinite(options.cash) ? options.cash : 100;
  return {
    version: STATE_VERSION, day: 1, phase: 'BRIEFING', cash,
    inventory: {}, prices: {}, experience: 0, level: 1,
    vocab: {}, encounters: [], history: [], reputation: 0, endlessUnlocked: false, endlessMode: false,
    customerIndex: 0, flags: {}, rngSeed: Number.isFinite(options.seed) ? options.seed >>> 0 : 1,
  };
}

export function normalizeState(input = {}) {
  const base = createInitialState();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return base;
  const inventory = input.inventory && typeof input.inventory === 'object' && !Array.isArray(input.inventory) ? input.inventory : {};
  const prices = input.prices && typeof input.prices === 'object' && !Array.isArray(input.prices) ? input.prices : {};
  const vocab = input.vocab && typeof input.vocab === 'object' && !Array.isArray(input.vocab) ? input.vocab : {};
  return {
    ...base, ...input, version: STATE_VERSION,
    day: Number.isInteger(input.day) && input.day > 0 ? input.day : 1,
    phase: PHASES.includes(input.phase) ? input.phase : 'BRIEFING',
    cash: Number.isFinite(input.cash) ? input.cash : base.cash,
    inventory: Object.fromEntries(Object.entries(inventory).filter(([, n]) => Number.isFinite(n) && n >= 0)),
    prices: Object.fromEntries(Object.entries(prices).filter(([, n]) => Number.isFinite(n) && n >= 0)),
    experience: Number.isFinite(input.experience) && input.experience >= 0 ? input.experience : 0,
    level: Number.isInteger(input.level) ? Math.min(10, Math.max(1, input.level)) : 1,
    vocab, history: Array.isArray(input.history) ? input.history : [],
    encounters: Array.isArray(input.encounters) ? input.encounters : [],
    rngSeed: Number.isFinite(input.rngSeed) ? input.rngSeed >>> 0 : base.rngSeed,
  };
}
