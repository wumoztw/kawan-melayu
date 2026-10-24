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

function cuteDurianOrchard() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'landmark');
  svg.setAttribute('viewBox', '0 0 140 150');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <path d="M0 150 V112 Q30 86 66 108 T140 100 V150 Z" fill="#c8ecb8"/>
    <path d="M0 150 V128 Q40 108 80 126 T140 120 V150 Z" fill="#a6dc94"/>
    <rect x="24" y="48" width="8" height="64" rx="3" fill="#b58a5e"/>
    <g fill="#7ccf6e">
      <circle cx="28" cy="38" r="20"/><circle cx="10" cy="50" r="14"/><circle cx="46" cy="50" r="14"/>
    </g>
    <path d="M18 62 V70 M38 60 V68" stroke="#9a7650" stroke-width="1.5" stroke-linecap="round"/>
    <g fill="#c9b458"><circle cx="18" cy="75" r="6"/><circle cx="38" cy="73" r="6"/></g>
    <g stroke="#7a8a3a" stroke-width="1.5" stroke-linecap="round"><path d="M13 72 l-2 -2 M23 72 l2 -2 M33 70 l-2 -2 M43 70 l2 -2 M18 82 v2 M38 80 v2"/></g>
    <ellipse cx="94" cy="141" rx="30" ry="4" fill="#8fc97d" opacity=".7"/>
    <path d="M94 66 l-4 -9 l8 4 l3 -9 l4 9 l8 -4 l-4 9 Z" fill="#8fbf5a" transform="translate(-4 2)"/>
    <circle cx="94" cy="100" r="36" fill="#8fbf5a"/>
    <g fill="#6f9f3f">
      <path d="M62 86 l-9 -3 l8 -6 Z"/><path d="M60 104 l-10 0 l9 -6 Z"/><path d="M66 120 l-9 3 l5 -9 Z"/>
      <path d="M126 86 l9 -3 l-8 -6 Z"/><path d="M128 104 l10 0 l-9 -6 Z"/><path d="M122 120 l9 3 l-5 -9 Z"/>
      <path d="M72 70 l-6 -7 l10 -1 Z"/><path d="M116 70 l6 -7 l-10 -1 Z"/><path d="M94 63 l-5 -7 l10 0 Z"/>
    </g>
    <path d="M70 98 Q94 78 118 98 Q118 128 94 134 Q70 128 70 98 Z" fill="#ffd54a"/>
    <path d="M78 104 Q94 94 110 104" fill="none" stroke="#f2b824" stroke-width="2" stroke-linecap="round"/>
    <circle cx="86" cy="107" r="4.2" fill="#3b2a14"/><circle cx="102" cy="107" r="4.2" fill="#3b2a14"/>
    <circle cx="87.4" cy="105.6" r="1.5" fill="#fff"/><circle cx="103.4" cy="105.6" r="1.5" fill="#fff"/>
    <path d="M89 115 Q94 121 99 115" fill="none" stroke="#3b2a14" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="80" cy="114" r="3.4" fill="#ff9eb0" opacity=".85"/><circle cx="108" cy="114" r="3.4" fill="#ff9eb0" opacity=".85"/>
  `;
  return svg;
}

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
  let menuOpen = false;

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
    const { lesson, level } = current();
    const lp = lessonProgress(progress, lesson);
    const toggle = h(
      'button',
      {
        class: 'menu-toggle',
        'aria-expanded': String(menuOpen),
        'aria-controls': 'level-menu',
        onclick: (e) => {
          e.stopPropagation();
          menuOpen = !menuOpen;
          render();
        },
      },
      menuOpen ? '收起 ▴' : '選擇單元 ▾',
    );
    const menu = h(
      'nav',
      { class: 'menu', id: 'level-menu', 'aria-label': '單元選單', onclick: (e) => e.stopPropagation() },
      data.levels.map((lv) =>
        h(
          'section',
          { class: 'menu-level' },
          h('h3', {}, `L${lv.id} ${lv.title}`),
          h(
            'div',
            { class: 'menu-lessons' },
            lv.lessons.map((ls) => {
              const p = lessonProgress(progress, ls);
              return h(
                'button',
                {
                  class: `menu-item${ls.id === lesson.id ? ' active' : ''}`,
                  onclick: () => {
                    menuOpen = false;
                    goto(ls.id);
                  },
                },
                `${ls.title}（${p.done}/${p.total}）`,
              );
            }),
          ),
        ),
      ),
    );
    return h(
      'header',
      { class: 'top' },
      h(
        'div',
        { class: 'top-row' },
        h(
          'div',
          { class: 'top-title' },
          h('h1', {}, '馬來語語言積木'),
          h('span', { class: 'top-sub' }, `L${level.id} ${level.title} (${lp.done}/${lp.total})`),
        ),
        toggle,
      ),
      menuOpen ? menu : null,
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
    root.replaceChildren(renderHeader(), renderStage(), cuteDurianOrchard());
  }

  document.addEventListener('click', () => {
    if (menuOpen) {
      menuOpen = false;
      render();
    }
  });

  startStep();
}
