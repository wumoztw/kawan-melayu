import { describe, expect, it } from 'vitest';
import { prepareHighLevelEncounter, revealTranslation, evaluateFinale, startEndlessMode } from '../src/engine/p3.js';

describe('Phase 3 and endless progression', () => {
  it('keeps free input with AI, degrades to a deterministic exercise without AI', () => {
    const item = { type: 'free_input', wordBank: ['maaf'] };
    expect(prepareHighLevelEncounter(item, true).type).toBe('free_input');
    expect(prepareHighLevelEncounter(item, false)).toMatchObject({ type: 'fill_blank', fallbackMode: true });
  });
  it('reveals Chinese only on request and charges one experience', () => {
    expect(revealTranslation({ experience: 4 })).toMatchObject({ experience: 3, translationRevealed: true });
  });
  it('awards the finale and unlocks endless mode only on condition', () => {
    const won = evaluateFinale({ day: 30, reputation: 80 }, true);
    expect(won).toMatchObject({ finale: 'winner', endlessUnlocked: true });
    expect(startEndlessMode(won).endlessMode).toBe(true);
    expect(evaluateFinale({ day: 30, reputation: 79 }, true).finale).toBe('extension');
  });
});
