export const STORAGE_KEY = 'kawan-melayu:progress';

export function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[.,!?;:]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function checkAnswer(tokens, target) {
  const given = Array.isArray(tokens) ? tokens.map((t) => t.toLowerCase()) : tokenize(tokens);
  const want = tokenize(target);
  return given.length === want.length && given.every((t, i) => t === want[i]);
}

export function shuffle(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildBlocks(step, distractors = [], rng = Math.random) {
  const words = [...tokenize(step.ms), ...distractors.map((d) => d.toLowerCase())];
  return shuffle(words, rng).map((word, id) => ({ id, word }));
}

export function stepKey(lessonId, index) {
  return `${lessonId}:${index}`;
}

export function findLesson(data, lessonId) {
  for (const level of data.levels) {
    const lesson = level.lessons.find((l) => l.id === lessonId);
    if (lesson) return { level, lesson };
  }
  return null;
}

export function createProgress() {
  return { completed: {}, current: { lessonId: null, step: 0 } };
}

export function loadProgress(storage) {
  const fresh = createProgress();
  try {
    const raw = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return fresh;
    const completed = {};
    for (const [k, v] of Object.entries(raw.completed ?? {})) if (v === true) completed[k] = true;
    const step = Number.isInteger(raw.current?.step) && raw.current.step >= 0 ? raw.current.step : 0;
    const lessonId = typeof raw.current?.lessonId === 'string' ? raw.current.lessonId : null;
    return { completed, current: { lessonId, step } };
  } catch {
    return fresh;
  }
}

export function saveProgress(storage, progress) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function completeStep(progress, lessonId, index) {
  return { ...progress, completed: { ...progress.completed, [stepKey(lessonId, index)]: true } };
}

export function lessonProgress(progress, lesson) {
  const done = lesson.steps.filter((_, i) => progress.completed[stepKey(lesson.id, i)]).length;
  return { done, total: lesson.steps.length };
}

export function overallProgress(progress, data) {
  let done = 0;
  let total = 0;
  for (const level of data.levels) {
    for (const lesson of level.lessons) {
      const p = lessonProgress(progress, lesson);
      done += p.done;
      total += p.total;
    }
  }
  return { done, total };
}

export function nextStep(data, lessonId, index) {
  const found = findLesson(data, lessonId);
  if (!found) return null;
  if (index + 1 < found.lesson.steps.length) return { lessonId, step: index + 1 };
  const all = data.levels.flatMap((l) => l.lessons);
  const next = all[all.findIndex((l) => l.id === lessonId) + 1];
  return next ? { lessonId: next.id, step: 0 } : null;
}

export function glossFor(data, word) {
  return data.glossary[word.toLowerCase()] ?? null;
}

function ankiField(text) {
  return String(text ?? '').replace(/[\t\r\n]+/g, ' ').trim();
}

function ankiTag(text) {
  return String(text ?? '').replace(/\s+/g, '_');
}

export function exportAnkiCards(data) {
  const rows = ['#separator:tab', '#html:false', '#tags column:3'];
  const add = (front, back, ...tags) => rows.push([front, back, tags.map(ankiTag).join(' ')].map(ankiField).join('\t'));
  for (const level of data.levels) {
    for (const lesson of level.lessons) {
      for (const step of lesson.steps) add(step.ms, step.zh, `Level-${level.id}`, lesson.title);
    }
  }
  for (const [word, g] of Object.entries(data.glossary)) add(word, `${g.zh}（${g.pos}）`, 'Glossary');
  return `${rows.join('\n')}\n`;
}
