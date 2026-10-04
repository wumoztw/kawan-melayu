import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/engine/rng.js';
import { createInitialState } from '../src/engine/state.js';
import { restock, sell } from '../src/engine/economy.js';
import { advanceDay } from '../src/engine/day.js';

function runBot(seed) {
  const random = mulberry32(seed);
  let state = { ...createInitialState({ seed }), phase: 'BRIEFING' };
  const dailyProfit = [];
  for (let day = 0; day < 10; day += 1) {
    state = advanceDay(state);
    const id = `product-${Math.floor(random() * 4)}`;
    const cashBefore = state.cash;
    state = restock(state, id, 20, 2);
    state = sell(state, id, 20, 5);
    dailyProfit.push(state.cash - cashBefore);
    for (const phase of ['RESTOCK', 'CLOSE']) state = { ...state, phase };
    if (day < 9) state = advanceDay(state);
  }
  return { state, dailyProfit };
}

describe('automated bot player', () => {
  it('completes 10 days reproducibly and earns RM 40-120 on Day 1', () => {
    const first = runBot(2025);
    expect(runBot(2025)).toEqual(first);
    expect(first.state.day).toBe(10);
    expect(first.dailyProfit[0]).toBeGreaterThanOrEqual(40);
    expect(first.dailyProfit[0]).toBeLessThanOrEqual(120);
  });
});
