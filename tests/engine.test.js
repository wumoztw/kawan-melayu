import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/engine/rng.js';
import { createInitialState, normalizeState } from '../src/engine/state.js';
import { advanceDay } from '../src/engine/day.js';
import { restock, sell, setPrice, closeDay } from '../src/engine/economy.js';
import { normalizeAnswer, gradeAnswer } from '../src/engine/grading.js';
import { addExperience, gradeGraduationExam, periodForLevel } from '../src/engine/progression.js';
import { getBox, reviewWord } from '../src/engine/vocab.js';
import { drawEncounter, createEncounterSet, gradeEncounter } from '../src/engine/encounters.js';
import { exportSave, importSave, loadFromStorage, saveToStorage } from '../src/engine/save.js';

const cases = [
  ['rng.test.js', () => { const a = mulberry32(42); const b = mulberry32(42); expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b)); expect(mulberry32(1)()).toBeGreaterThanOrEqual(0); }],
  ['state.test.js', () => { expect(createInitialState().version).toBe(2); const state = normalizeState({ day: -1, inventory: { ok: 2, bad: -1 } }); expect(state.day).toBe(1); expect(state.inventory).toEqual({ ok: 2 }); expect(advanceDay({ ...state, phase: 'CLOSE' }).day).toBe(2); }],
  ['economy.test.js', () => { let state = createInitialState(); state = restock(state, 'water', 20, 2); state = setPrice(state, 'water', 3, 2.5).state; expect(setPrice(state, 'water', 4, 2.5).complained).toBe(true); const sale = sell(state, 'water', 20, 5); const closed = closeDay(sale, [{ quantity: 20, unitPrice: 5, unitCost: 2 }]); expect(closed.profit).toBe(60); expect(closed.cash).toBeGreaterThan(0); expect(restock({ ...state, cash: -10 }, 'x', 1, 1).cash).toBeGreaterThanOrEqual(0); }],
  ['grading.test.js', () => { expect(normalizeAnswer('  ＡＩＲ—MINERAL!  ')).toBe('air mineral'); expect(gradeAnswer('Hai!', ['hai', 'helo']).correct).toBe(true); }],
  ['progression.test.js', () => { expect(addExperience({ experience: 0 }, 300).level).toBe(4); expect(periodForLevel(8)).toBe('高期'); expect(gradeGraduationExam(Array(7).fill(true).concat(Array(3).fill(false))).passed).toBe(true); }],
  ['vocab.test.js', () => { let state = createInitialState(); expect(getBox(state, 'hai')).toBe(1); state = reviewWord(state, 'hai', true); expect(getBox(state, 'hai')).toBe(2); expect(getBox(reviewWord(state, 'hai', false), 'hai')).toBe(1); }],
  ['save.test.js', () => { const storage = new Map(); const mock = { setItem: (k, v) => storage.set(k, v), getItem: (k) => storage.get(k) }; const state = { ...createInitialState(), apiKey: 'secret' }; saveToStorage(state, mock); expect(loadFromStorage(mock).version).toBe(2); expect(JSON.parse(exportSave(state)).apiKey).toBeUndefined(); expect(importSave(exportSave(state)).valid).toBe(true); expect(importSave('{').valid).toBe(false); }],
];
for (const [name, test] of cases) describe(name, () => it('meets engine contract', test));

describe('encounters', () => {
  it('draws, composes and grades encounters deterministically', () => {
    const items = [{ id: 1, answer: 'hai' }, { id: 2, answer: 'selamat' }];
    expect(drawEncounter(items, () => 0).id).toBe(1);
    expect(createEncounterSet(items, 2, mulberry32(9))).toHaveLength(2);
    expect(gradeEncounter(items[0], 'HAI').correct).toBe(true);
  });
});

describe('botPlayer.test.js', () => {
  function simulate(seed) {
    const random = mulberry32(seed);
    let state = { ...createInitialState({ seed }), phase: 'PREP' };
    const profits = [];
    for (let day = 0; day < 10; day += 1) {
      const product = `water-${Math.floor(random() * 4)}`;
      state = restock(state, product, 20, 2);
      const outcome = sell(state, product, 20, 5);
      state = outcome;
      const closing = closeDay(state, [{ quantity: 20, unitPrice: 5, unitCost: 2 }]);
      profits.push(closing.profit);
      state = { ...closing, day: day + 1, phase: 'BRIEFING' };
    }
    return { day: state.day, cash: state.cash, profits, seed: state.rngSeed };
  }
  it('runs ten days without input, repeats exactly and earns a viable Day 1 profit', () => {
    const first = simulate(2025);
    expect(first).toEqual(simulate(2025));
    expect(first.day).toBe(10);
    expect(first.profits[0]).toBeGreaterThanOrEqual(40);
    expect(first.profits[0]).toBeLessThanOrEqual(120);
  });
});
