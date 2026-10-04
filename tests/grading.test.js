import { it, expect } from 'vitest';
import { normalizeAnswer, gradeAnswer } from '../src/engine/grading.js';
it('normalizes Unicode and accepts variants', () => { expect(normalizeAnswer(' ＨＡＩ!!  ')).toBe('hai'); expect(gradeAnswer('Hai!', ['helo', 'hai']).correct).toBe(true); });
it('never treats empty input as a correct answer', () => { expect(gradeAnswer('', '').correct).toBe(false); expect(gradeAnswer('  ', ['']).correct).toBe(false); });
