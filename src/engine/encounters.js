import { pickRandom } from './rng.js';
import { gradeAnswer } from './grading.js';
export function drawEncounter(encounters, random = Math.random, filter = () => true) { return pickRandom((encounters || []).filter(filter), random); }
export function composeEncounter(encounter, context = {}) { return { ...encounter, ...context, options: [...(encounter.options || [])] }; }
export function gradeEncounter(encounter, answer) { return gradeAnswer(answer, encounter.acceptedAnswers || encounter.answers || encounter.answer || []); }
export function createEncounterSet(encounters, count, random = Math.random) {
  const pool = [...(encounters || [])]; const selected = [];
  while (pool.length && selected.length < count) { const index = Math.floor(random() * pool.length); selected.push(pool.splice(index, 1)[0]); }
  return selected;
}
