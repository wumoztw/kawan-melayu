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

const SVG_NS = 'http://www.w3.org/2000/svg';

// 單顆榴槤：橢圓果身 + 規律排列的尖刺 + 短果柄（定義於原點，頂端為吊掛點）
function durianSymbol() {
  const spikes = [];
  for (let row = 0; row < 6; row += 1) {
    const y = 6 + row * 4.4;
    const half = Math.sin(((row + 0.7) / 6.4) * Math.PI) * 6.2;
    for (let col = -2; col <= 2; col += 1) {
      const x = col * 2.6 + (row % 2) * 1.3;
      if (Math.abs(x) <= half) spikes.push(`M${x - 1.2} ${y + 1.6} L${x} ${y - 1.6} L${x + 1.2} ${y + 1.6} Z`);
    }
  }
  return `<symbol id="durian" overflow="visible">
    <path d="M0 0 V4" stroke="#5b4527" stroke-width="1.6"/>
    <ellipse cx="0" cy="16" rx="8.4" ry="12.4" fill="#8d9a3c"/>
    <ellipse cx="-2.4" cy="13" rx="4" ry="8" fill="#a8b455" opacity=".55"/>
    <path d="${spikes.join(' ')}" fill="#5f6a26"/>
    <path d="M0 4 V28" stroke="#6b7a2a" stroke-width=".7" opacity=".6"/>
  </symbol>`;
}

// 單棵榴槤樹：樹幹、分枝、多層樹冠與垂掛果實
function durianTree(x, scale, fruits) {
  const crown = [
    ['#2f5d34', -64, -122, 58, 30], ['#2f5d34', 50, -118, 62, 32], ['#3b7040', 0, -146, 70, 34],
    ['#4a8248', -32, -104, 56, 26], ['#4a8248', 38, -100, 54, 26], ['#5c9455', 0, -122, 50, 22],
  ];
  const leaves = crown
    .map(([c, cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}"/>`)
    .join('');
  const hang = fruits
    .map(([fx, fy, fs]) => `<use href="#durian" x="${fx}" y="${fy}" transform="translate(${fx} ${fy}) scale(${fs}) translate(${-fx} ${-fy})"/>`)
    .join('');
  return `<g transform="translate(${x} 232) scale(${scale})">
    <path d="M-9 0 Q-6 -40 -7 -80 Q-8 -100 -3 -116 L5 -116 Q10 -96 8 -78 Q8 -40 11 0 Z" fill="#6b4f33"/>
    <path d="M-3 -4 Q-2 -50 -3 -96 M4 -6 Q5 -50 3 -90" stroke="#4d3722" stroke-width="1" fill="none" opacity=".7"/>
    <g stroke="#5b4129" stroke-width="5" stroke-linecap="round" fill="none">
      <path d="M0 -84 Q-30 -92 -58 -88"/><path d="M2 -90 Q34 -98 62 -92"/><path d="M0 -104 Q-20 -112 -40 -112"/><path d="M2 -106 Q24 -114 44 -110"/>
    </g>
    ${leaves}${hang}
  </g>`;
}

function renderRealisticDurianOrchard() {
  const trees = [
    [70, 0.95, [[-40, -84, 1], [-18, -90, 0.85], [-60, -86, 0.8]]],
    [210, 0.8, [[-38, -86, 0.9], [-14, -92, 0.8], [30, -94, 1], [54, -88, 0.85]]],
    [350, 1.05, [[-52, -88, 1], [-30, -94, 0.85], [24, -96, 0.95], [48, -90, 1]]],
    [500, 0.85, [[-44, -86, 0.9], [-20, -90, 1], [28, -94, 0.85], [52, -88, 0.9]]],
    [650, 1.1, [[-54, -88, 0.95], [-32, -94, 0.85], [-12, -90, 1], [26, -96, 0.9], [50, -90, 1]]],
    [800, 0.82, [[-42, -86, 0.9], [-16, -92, 0.85], [32, -94, 1], [56, -88, 0.8]]],
    [940, 1, [[-48, -88, 1], [-24, -92, 0.85], [22, -96, 0.9], [46, -90, 0.95]]],
  ];
  const ground = [[120, 244], [280, 246], [430, 243], [575, 247], [730, 244], [880, 246], [60, 247]]
    .map(([gx, gy], i) => `<use href="#durian" transform="translate(${gx} ${gy}) rotate(${70 + i * 17}) scale(.8)"/>`)
    .join('');
  const grass = Array.from({ length: 70 }, (_, i) => {
    const gx = 8 + i * 14.2;
    const gy = 236 + ((i * 7) % 5);
    return `M${gx} ${gy} l-3 -9 M${gx} ${gy} l1 -11 M${gx} ${gy} l4 -8`;
  }).join(' ');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'durian-orchard-panorama');
  svg.setAttribute('viewBox', '0 0 1000 240');
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>${durianSymbol()}</defs>
    <path d="M0 150 L90 96 L170 132 L270 70 L370 128 L470 84 L580 134 L690 62 L790 120 L880 80 L1000 126 V240 H0 Z" fill="#b8d5e5"/>
    <path d="M0 176 L120 128 L240 160 L380 118 L520 162 L660 124 L800 160 L920 130 L1000 154 V240 H0 Z" fill="#9fc3c4" opacity=".8"/>
    <path d="M0 240 V196 Q140 170 300 194 T620 188 T1000 186 V240 Z" fill="#a4c39e"/>
    <path d="M0 240 V214 Q180 198 360 214 T720 210 T1000 208 V240 Z" fill="#86af80"/>
    ${trees.map(([x, s, f]) => durianTree(x, s, f)).join('')}
    <path d="M0 240 V228 Q250 220 500 228 T1000 226 V240 Z" fill="#6e9a6a"/>
    <path d="${grass}" stroke="#4f7d4a" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <g fill="#8a6a3c" opacity=".7"><ellipse cx="160" cy="238" rx="9" ry="2"/><ellipse cx="420" cy="239" rx="11" ry="2"/><ellipse cx="760" cy="238" rx="10" ry="2"/></g>
    ${ground}
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
    root.replaceChildren(renderHeader(), renderStage(), renderRealisticDurianOrchard());
  }

  document.addEventListener('click', () => {
    if (menuOpen) {
      menuOpen = false;
      render();
    }
  });

  startStep();
}
