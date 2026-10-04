import { it, expect } from 'vitest';
import { addExperience, periodForLevel, gradeGraduationExam } from '../src/engine/progression.js';
it('tracks levels, periods and ten-question graduation', () => { expect(addExperience({ experience: 0 }, 300).level).toBe(4); expect(periodForLevel(8)).toBe('高期'); expect(gradeGraduationExam(Array(7).fill(true).concat(Array(3).fill(false))).passed).toBe(true); });
