import { it, expect } from 'vitest';
import { createInitialState } from '../src/engine/state.js';
import { getBox, reviewWord } from '../src/engine/vocab.js';
it('moves Leitner cards up on success and resets on failure', () => { const s = createInitialState(); expect(getBox(s, 'x')).toBe(1); expect(getBox(reviewWord(s, 'x', true), 'x')).toBe(2); expect(getBox(reviewWord({ vocab: { x: 5 } }, 'x', false), 'x')).toBe(1); });
