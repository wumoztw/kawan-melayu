import { it, expect } from 'vitest';
import { createInitialState } from '../src/engine/state.js';
import { restock, sell, setPrice, closeDay } from '../src/engine/economy.js';
it('supports stock, markup complaint, sales, day profit and relief loan', () => { let s = restock(createInitialState(), 'x', 20, 2); expect(setPrice(s, 'x', 4, 2.5).complained).toBe(true); s = sell(s, 'x', 20, 5); expect(closeDay(s, [{ quantity: 20, unitPrice: 5, unitCost: 2 }]).profit).toBe(60); expect(restock({ ...s, cash: -10 }, 'y', 1, 1).cash).toBeGreaterThanOrEqual(0); });
