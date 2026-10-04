export const MIN_BOX = 1;
export const MAX_BOX = 5;
export function getBox(state, wordId) { return Math.min(MAX_BOX, Math.max(MIN_BOX, state.vocab?.[wordId] || MIN_BOX)); }
export function reviewWord(state, wordId, correct) {
  const box = getBox(state, wordId);
  const nextBox = correct ? Math.min(MAX_BOX, box + 1) : MIN_BOX;
  return { ...state, vocab: { ...(state.vocab || {}), [wordId]: nextBox } };
}
export function wordsDue(state, box = 1) { return Object.entries(state.vocab || {}).filter(([, current]) => current <= box).map(([id]) => id); }
