import { it, expect } from 'vitest';
import { createInitialState, normalizeState } from '../src/engine/state.js';
it('initializes v2 state and sanitizes malformed values', () => { expect(createInitialState().version).toBe(2); expect(normalizeState({ day: -1, inventory: { good: 2, bad: -3 } })).toMatchObject({ day: 1, inventory: { good: 2 } }); });
