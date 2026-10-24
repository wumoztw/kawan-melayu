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

function cuteTowers() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'landmark');
  svg.setAttribute('viewBox', '0 0 120 160');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <ellipse cx="60" cy="152" rx="46" ry="6" fill="#c5dcf3"/>
    <rect x="18" y="148" width="84" height="6" rx="3" fill="#dbeafe"/>
    <g fill="#7eb6ef">
      <path d="M28 148 V62 Q28 48 40 46 Q52 48 52 62 V148 Z"/>
      <path d="M68 148 V62 Q68 48 80 46 Q92 48 92 62 V148 Z"/>
    </g>
    <g fill="#eff6ff">
      <rect x="33" y="70" width="6" height="8" rx="1.5"/><rect x="42" y="70" width="6" height="8" rx="1.5"/>
      <rect x="33" y="86" width="6" height="8" rx="1.5"/><rect x="42" y="86" width="6" height="8" rx="1.5"/>
      <rect x="33" y="102" width="6" height="8" rx="1.5"/><rect x="42" y="102" width="6" height="8" rx="1.5"/>
      <rect x="33" y="118" width="6" height="8" rx="1.5"/><rect x="42" y="118" width="6" height="8" rx="1.5"/>
      <rect x="73" y="70" width="6" height="8" rx="1.5"/><rect x="82" y="70" width="6" height="8" rx="1.5"/>
      <rect x="73" y="86" width="6" height="8" rx="1.5"/><rect x="82" y="86" width="6" height="8" rx="1.5"/>
      <rect x="73" y="102" width="6" height="8" rx="1.5"/><rect x="82" y="102" width="6" height="8" rx="1.5"/>
      <rect x="73" y="118" width="6" height="8" rx="1.5"/><rect x="82" y="118" width="6" height="8" rx="1.5"/>
    </g>
    <path d="M34 78 H86 V88 Q86 96 78 96 H42 Q34 96 34 88 Z" fill="#60a5fa"/>
    <circle cx="40" cy="84" r="2.2" fill="#1e3a8a"/><circle cx="80" cy="84" r="2.2" fill="#1e3a8a"/>
    <path d="M36 87 Q40 90 44 87" fill="none" stroke="#1e3a8a" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M76 87 Q80 90 84 87" fill="none" stroke="#1e3a8a" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="37" cy="88" r="1.6" fill="#fda4af" opacity=".8"/><circle cx="83" cy="88" r="1.6" fill="#fda4af" opacity=".8"/>
    <path d="M40 46 L40 28 L46 22 L52 28 L52 46" fill="#93c5fd"/>
    <path d="M68 46 L68 28 L74 22 L80 28 L80 46" fill="#93c5fd"/>
    <circle cx="46" cy="16" r="3" fill="#bfdbfe"/><circle cx="74" cy="16" r="3" fill="#bfdbfe"/>
    <path d="M46 16 V6 M74 16 V6" stroke="#93c5fd" stroke-width="1.5" stroke-linecap="round"/>
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
          h('h1', {}, '語言積木'),
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
    root.replaceChildren(renderHeader(), renderStage(), cuteTowers());
  }

  document.addEventListener('click', () => {
    if (menuOpen) {
      menuOpen = false;
      render();
    }
  });

  startStep();
}
