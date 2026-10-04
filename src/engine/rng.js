export function mulberry32(seed = 0) {
  let state = Number(seed) >>> 0;
  return function random() {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRandom(items, random = Math.random) {
  if (!Array.isArray(items) || items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}
