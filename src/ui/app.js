import {
  buildBlocks,
  checkAnswer,
  completeStep,
  findLesson,
  glossFor,
  lessonProgress,
  loadProgress,
  nextStep,
  overallProgress,
  saveProgress,
  stepKey,
  tokenize,
} from '../engine/scaffolding-engine.js';
import { speak } from './speech.js';

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  node.append(...children.flat().filter((c) => c != null));
  return node;
}

export function mountApp(root, data, storage) {
  let progress = loadProgress(storage);
  const firstLesson = data.levels[0].lessons[0];
  if (!findLesson(data, progress.current.lessonId)) {
    progress.current = { lessonId: firstLesson.id, step: 0 };
  }
  let placed = [];
  let blocks = [];
  let feedback = '';
  let showHint = false;
  let solved = false;

  const current = () => {
    const { lesson, level } = findLesson(data, progress.current.lessonId);
    const step = lesson.steps[Math.min(progress.current.step, lesson.steps.length - 1)];
    return { lesson, level, step };
  };

  function startStep() {
    const { lesson, step } = current();
    blocks = buildBlocks(step, lesson.distractors);
    placed = [];
    feedback = '';
    showHint = false;
    solved = progress.completed[stepKey(lesson.id, progress.current.step)] === true;
    render();
  }

  function goto(lessonId, step = 0) {
    progress = { ...progress, current: { lessonId, step } };
    saveProgress(storage, progress);
    startStep();
  }

  function place(block) {
    if (solved || placed.includes(block.id)) return;
    placed = [...placed, block.id];
    feedback = '';
    render();
  }

  function unplace(id) {
    if (solved) return;
    placed = placed.filter((p) => p !== id);
    feedback = '';
    render();
  }

  function submit(tokens) {
    const { lesson, step } = current();
    if (checkAnswer(tokens, step.ms)) {
      progress = completeStep(progress, lesson.id, progress.current.step);
      saveProgress(storage, progress);
      solved = true;
      feedback = '✓ 答對了！';
      speak(step.ms);
    } else {
      feedback = '再試一次：順序或單字不太對。';
    }
    render();
  }

  function wordChip(word, extra = {}) {
    const gloss = glossFor(data, word);
    const tip = gloss ? `${gloss.zh}（${gloss.pos}）` : '';
    return h('span', { class: 'chip-word', title: tip, ...extra }, word);
  }

  function renderHeader() {
    const { done, total } = overallProgress(progress, data);
    const pct = total ? Math.round((done / total) * 100) : 0;
    return h(
      'header',
      { class: 'top' },
      h('h1', {}, 'Kawan Melayu · 語言積木'),
      h(
        'select',
        {
          'aria-label': '單元選單',
          onchange: (e) => goto(e.target.value),
        },
        data.levels.map((level) =>
          h(
            'optgroup',
            { label: `Level ${level.id} · ${level.title}` },
            level.lessons.map((lesson) => {
              const p = lessonProgress(progress, lesson);
              const opt = h('option', { value: lesson.id }, `${lesson.title}（${p.done}/${p.total}）`);
              opt.selected = lesson.id === progress.current.lessonId;
              return opt;
            }),
          ),
        ),
      ),
      h(
        'div',
        { class: 'progress', 'aria-label': `總進度 ${pct}%` },
        h('div', { class: 'bar' }, h('div', { class: 'fill', style: `width:${pct}%` })),
        h('span', {}, `${done}/${total}`),
      ),
    );
  }

  function renderStage() {
    const { lesson, level, step } = current();
    const idx = progress.current.step;
    const byId = new Map(blocks.map((b) => [b.id, b]));
    const stepDots = lesson.steps.map((_, i) =>
      h('button', {
        class: `dot${i === idx ? ' active' : ''}${progress.completed[stepKey(lesson.id, i)] ? ' done' : ''}`,
        'aria-label': `第 ${i + 1} 階`,
        onclick: () => goto(lesson.id, i),
      }),
    );

    const answer = h(
      'div',
      { class: 'answer', 'aria-label': '積木拼接區' },
      placed.length
        ? placed.map((id) =>
            h('button', { class: 'block placed', onclick: () => unplace(id) }, byId.get(id).word),
          )
        : h('span', { class: 'placeholder' }, '點下方積木，拼出句子'),
    );

    const tray = h(
      'div',
      { class: 'tray', 'aria-label': '可用積木' },
      blocks.map((b) => {
        const used = placed.includes(b.id);
        const btn = h('button', { class: `block${used ? ' used' : ''}`, onclick: () => place(b) }, b.word);
        btn.disabled = used || solved;
        const gloss = glossFor(data, b.word);
        if (gloss) btn.title = `${gloss.zh}（${gloss.pos}）`;
        return btn;
      }),
    );

    const typed = h('input', {
      class: 'typed',
      type: 'text',
      placeholder: '或直接輸入馬來文…',
      autocomplete: 'off',
      'aria-label': '鍵盤拼字',
      onkeydown: (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) submit(tokenize(e.target.value));
      },
    });
    typed.disabled = solved;

    const hint = showHint
      ? h(
          'div',
          { class: 'hint' },
          h('p', { class: 'ms' }, step.ms),
          h(
            'ul',
            {},
            tokenize(step.ms).map((w) => {
              const g = glossFor(data, w);
              return h('li', {}, wordChip(w), g ? ` ${g.zh} · ${g.pos}` : '');
            }),
          ),
        )
      : null;

    const next = nextStep(data, lesson.id, idx);
    return h(
      'main',
      { class: 'stage' },
      h('p', { class: 'crumb' }, `Level ${level.id} · ${lesson.title} · 第 ${idx + 1}/${lesson.steps.length} 階`),
      h('div', { class: 'dots' }, stepDots),
      h('h2', { class: 'target' }, step.zh),
      answer,
      tray,
      typed,
      h(
        'div',
        { class: 'actions' },
        h('button', { class: 'primary', onclick: () => submit(placed.map((id) => byId.get(id).word)) }, '檢查'),
        h('button', { onclick: () => { placed = []; feedback = ''; render(); } }, '清除'),
        h('button', { onclick: () => speak(step.ms) }, '🔊 發音'),
        h('button', { onclick: () => { showHint = !showHint; render(); } }, showHint ? '隱藏解析' : '顯示解析'),
        solved && next
          ? h('button', { class: 'primary', onclick: () => goto(next.lessonId, next.step) }, '下一階 →')
          : null,
      ),
      h('p', { class: `feedback${solved ? ' ok' : ''}`, role: 'status' }, feedback),
      hint,
    );
  }

  function render() {
    root.replaceChildren(renderHeader(), renderStage());
  }

  startStep();
}
