import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STORAGE_KEY,
  buildBlocks,
  checkAnswer,
  completeStep,
  createProgress,
  findLesson,
  lessonProgress,
  loadProgress,
  nextStep,
  overallProgress,
  saveProgress,
  tokenize,
} from '../src/engine/scaffolding-engine.js';

const data = JSON.parse(readFileSync(new URL('../src/data/scaffolding-lessons.json', import.meta.url), 'utf8'));

function memoryStorage(initial = {}) {
  const store = { ...initial };
  return {
    store,
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
  };
}

test('tokenize ignores case and punctuation', () => {
  assert.deepEqual(tokenize('Boleh saya minta air?'), ['boleh', 'saya', 'minta', 'air']);
  assert.deepEqual(tokenize('Lima ringgit. Terima kasih.'), ['lima', 'ringgit', 'terima', 'kasih']);
});

test('checkAnswer accepts correct order only', () => {
  assert.ok(checkAnswer(['saya', 'mau', 'air', 'sejuk'], 'Saya mau air sejuk'));
  assert.ok(checkAnswer('saya mau air sejuk', 'Saya mau air sejuk'));
  assert.ok(!checkAnswer(['saya', 'mau', 'sejuk', 'air'], 'Saya mau air sejuk'));
  assert.ok(!checkAnswer(['saya', 'mau', 'air'], 'Saya mau air sejuk'));
  assert.ok(!checkAnswer([], 'Saya mau'));
});

test('buildBlocks contains every target word plus distractors', () => {
  const blocks = buildBlocks({ ms: 'Saya mau air' }, ['kopi']);
  assert.deepEqual(blocks.map((b) => b.word).sort(), ['air', 'kopi', 'mau', 'saya']);
  assert.equal(new Set(blocks.map((b) => b.id)).size, 4);
});

test('lesson data: 20 levels, all words glossed, distractors not breaking uniqueness', () => {
  assert.equal(data.levels.length, 20);
  for (const level of data.levels) {
    for (const lesson of level.lessons) {
      for (const word of [...lesson.steps.flatMap((s) => tokenize(s.ms)), ...lesson.distractors]) {
        assert.ok(data.glossary[word], `missing glossary entry: ${word} (${lesson.id})`);
      }
    }
  }
});

test('progress persists and round-trips through storage', () => {
  const storage = memoryStorage();
  let progress = completeStep(createProgress(), '1-1', 0);
  progress = { ...progress, current: { lessonId: '1-1', step: 1 } };
  assert.ok(saveProgress(storage, progress));
  assert.deepEqual(loadProgress(storage), progress);
});

test('loadProgress tolerates corrupt data', () => {
  assert.deepEqual(loadProgress(memoryStorage({ [STORAGE_KEY]: '{bad json' })), createProgress());
  assert.deepEqual(loadProgress(null), createProgress());
  const odd = loadProgress(memoryStorage({
    [STORAGE_KEY]: JSON.stringify({ completed: { '1-1:0': true, x: 'yes' }, current: { lessonId: 5, step: -2 } }),
  }));
  assert.deepEqual(odd, { completed: { '1-1:0': true }, current: { lessonId: null, step: 0 } });
});

test('progress counters', () => {
  const { lesson } = findLesson(data, '1-1');
  let progress = createProgress();
  assert.deepEqual(lessonProgress(progress, lesson), { done: 0, total: 3 });
  progress = completeStep(progress, '1-1', 2);
  assert.deepEqual(lessonProgress(progress, lesson), { done: 1, total: 3 });
  const overall = overallProgress(progress, data);
  assert.equal(overall.done, 1);
  assert.ok(overall.total > 10);
});

test('nextStep advances within and across lessons, null at the end', () => {
  assert.deepEqual(nextStep(data, '1-1', 0), { lessonId: '1-1', step: 1 });
  assert.deepEqual(nextStep(data, '1-1', 2), { lessonId: '1-2', step: 0 });
  assert.equal(nextStep(data, '20-2', 3), null);
  assert.equal(nextStep(data, 'nope', 0), null);
});
