import { it, expect } from 'vitest';
import { mulberry32 } from '../src/engine/rng.js';
it('mulberry32 is seeded and yields numbers in [0,1)', () => { const a = mulberry32(12); const b = mulberry32(12); expect(Array.from({ length: 8 }, a)).toEqual(Array.from({ length: 8 }, b)); expect(mulberry32(1)()).toBeLessThan(1); });
