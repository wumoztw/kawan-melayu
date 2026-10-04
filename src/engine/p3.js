export const P3_SCENARIOS = ['道歉', '換貨', '大宗批發談判', '客訴安撫'];
export function prepareHighLevelEncounter(encounter, aiAvailable = false) {
  if (!encounter || encounter.type !== 'free_input' || aiAvailable) return encounter;
  return { ...encounter, type: encounter.wordBank?.length ? 'fill_blank' : 'choice', fallbackMode: true };
}
export function revealTranslation(state) {
  return { ...state, experience: Math.max(0, (state.experience || 0) - 1), translationRevealed: true };
}
export function evaluateFinale(state, passedGraduation) {
  const won = state.day >= 30 && (state.reputation || 0) >= 80 && passedGraduation;
  return { ...state, finale: won ? 'winner' : 'extension', endlessUnlocked: Boolean(state.endlessUnlocked || won), endlessMode: Boolean(state.endlessMode) };
}
export function startEndlessMode(state) {
  if (!state.endlessUnlocked) return state;
  return { ...state, endlessMode: true, endlessDay: (state.endlessDay || 0) + 1 };
}
