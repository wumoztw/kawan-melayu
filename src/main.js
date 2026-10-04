import days from './data/days.json';
import encounters1 from './data/encounters.p1.json';
import encounters2 from './data/encounters.p2.json';
import encounters3 from './data/encounters.p3.json';
import phrases from './data/phrases.json';
import exams from './data/exam.json';
import { createInitialState } from './engine/state.js';
import { loadFromStorage, saveToStorage, importSave, exportSave } from './engine/save.js';
import { gradeAnswer } from './engine/grading.js';
import { reviewWord } from './engine/vocab.js';
import { dialogue } from './ui/components/dialogue.js';
import { statusBar } from './ui/components/statusBar.js';
import { fillBlank } from './ui/components/fillBlank.js';
import { speakMalay, hasMalayVoice } from './ui/tts.js';
import { evaluateFinale, revealTranslation, startEndlessMode } from './engine/p3.js';

const root = document.querySelector('#app');
let state = loadFromStorage() || createInitialState();
let screen = 'title'; let currentExam = []; let examPhase = 1; let q = 0; let score = 0;
const encounters = [...encounters1, ...encounters2, ...encounters3];
function persist() { try { saveToStorage(state); } catch {} }
function button(parent, label, fn, secondary = false) { const b = document.createElement('button'); b.textContent = label; if (secondary) b.className = 'secondary'; b.addEventListener('click', fn); parent.append(b); return b; }
function go(next) { screen = next; render(); }
function startExam(phase) { examPhase = phase; currentExam = exams.filter((item) => item.phase === phase).sort(() => Math.random() - 0.5).slice(0, 10); q = 0; score = 0; go('exam'); }
function render() {
  root.replaceChildren(); const wrap = document.createElement('section'); root.append(wrap); statusBar(wrap, state);
  const title = document.createElement('h1'); title.textContent = 'Kawan Melayu｜便利商店馬來語'; wrap.append(title);
  if (screen === 'title') { title.textContent = '歡迎來到 Kawan Melayu'; wrap.append(document.createTextNode('離線也能玩的馬來語便利商店旅程')); button(wrap, '開始／繼續冒險', () => go('briefing')); button(wrap, '單字本', () => go('vocabBook')); button(wrap, '設定與存檔', () => go('settings')); return; }
  if (screen === 'briefing' || screen === 'store' || screen === 'summary') {
    if (state.day === 11) { startExam(1); return; }
    if (state.day === 21) { startExam(2); return; }
    if (state.day > 30) { state = evaluateFinale(state, Boolean(state.p3GraduationPassed)); title.textContent = state.finale === 'winner' ? 'Anugerah Kedai Terbaik Pekan' : '延長營業期'; wrap.append(document.createTextNode(state.finale === 'winner' ? '恭喜！你以優異口碑完成高期旅程。' : '再累積口碑並通過高期畢業小考，即可獲得最佳商店獎。')); if (state.endlessUnlocked) button(wrap, '開始無盡模式', () => { state = startEndlessMode(state); state.day = 31; persist(); go('briefing'); }); button(wrap, '繼續冒險', () => { state.day = 30; persist(); go('briefing'); }); persist(); return; }
    const d = days.find((item) => item.day === state.day); const enc = encounters.find((item) => item.id === d?.encounterId);
    const cast = { encik_lim: 'Encik Lim（華裔批發商）', encik_raju: 'Encik Raju（印度裔批發商）' };
    const ms = enc?.lines?.[0]?.ms || ''; dialogue(wrap, cast[enc?.speaker] || enc?.speaker || 'Abang Zul', `${d?.title || `第 ${state.day} 天`}：${d?.story || '歡迎光臨！'} ${ms}`, { typewriter: true, onSpeak: hasMalayVoice() ? () => speakMalay(ms) : undefined });
    const translation = document.createElement('p'); translation.hidden = true; translation.textContent = enc?.lines?.[0]?.zh || ''; wrap.append(translation); button(wrap, '顯示華語翻譯（微扣經驗）', () => { translation.hidden = !translation.hidden; if (!translation.hidden) { state = revealTranslation(state); persist(); render(); } });
    const input = fillBlank(wrap, state.day <= 15 ? '選擇字庫答案或輸入馬來語' : '自行輸入馬來語填空');
    if (enc?.wordBank?.length) for (const word of enc.wordBank) button(wrap, word, () => { input.value = word; }, true);
    const prompt = document.createElement('p'); prompt.textContent = enc?.prompt || enc?.hint || ''; wrap.append(prompt);
    button(wrap, '提交回應', () => {
      const answer = input.value.trim(); const correct = gradeAnswer(answer, enc?.acceptedAnswers || enc?.answer || '').correct;
      if (enc?.vocab?.[0]) state = reviewWord(state, enc.vocab[0], correct);
      state.experience += correct ? 10 : 2; state.level = Math.min(state.day <= 10 ? 3 : 6, Math.max(state.level, state.day <= 10 ? 1 + Math.floor(state.experience / 40) : 4 + Math.floor((state.day - 11) / 5)));
      state.history.push({ day: state.day, answer, correct }); state.reputation = Math.max(0, (state.reputation || 0) + (correct ? 10 : 0)); state.cash += correct ? 2 : 0; if (state.day === 30) state.p3GraduationPassed = state.history.filter((entry) => entry.day >= 21 && entry.day <= 30 && entry.correct).length + Number(correct) >= 7; state.day++; persist();
      if (state.day === 11) startExam(1); else if (state.day === 21) startExam(2); else go('summary');
    });
    button(wrap, '借款／救濟（Pak Cik Hamid）', () => { state.cash += 10; state.history.push({ day: state.day, relief: true }); persist(); render(); }, true); button(wrap, '單字本', () => go('vocabBook'), true); button(wrap, '回主選單', () => go('title'), true); return;
  }
  if (screen === 'vocabBook') { title.textContent = '單字本｜依分類'; const categories = [...new Set(phrases.map((item) => item.category || '日常'))]; const select = document.createElement('select'); const all = document.createElement('option'); all.textContent = '全部分類'; all.value = ''; select.append(all); categories.forEach((category) => { const option = document.createElement('option'); option.textContent = category; option.value = category; select.append(option); }); wrap.append(select); const list = document.createElement('div'); wrap.append(list); const update = () => { list.replaceChildren(); phrases.filter((item) => !select.value || item.category === select.value).forEach((item) => { const row = document.createElement('div'); row.className = 'word'; row.textContent = `${item.malay || item.ms || item.id} — ${item.chinese || item.zh || ''} · Leitner 盒 ${state.vocab[item.id] || 1}`; list.append(row); if (hasMalayVoice()) button(row, '🔊', () => speakMalay(item.malay || item.ms || item.id), true); }); }; select.addEventListener('change', update); update(); button(wrap, '返回', () => go('title')); return; }
  if (screen === 'exam') { const phase = examPhase; title.textContent = phase === 2 ? 'Day 20 中期畢業小考' : 'Day 10 初期畢業小考'; if (q >= 10) { const passed = score >= 7; const p = document.createElement('p'); p.textContent = `成績 ${score}/10（${score * 10}%）— ${passed ? '通過！畢業！' : '未達 70%，再接再厲。'}`; wrap.append(p); button(wrap, '繼續第 11 天', () => go('briefing')); return; } const item = currentExam[q]; const prompt = document.createElement('p'); prompt.textContent = `第 ${q + 1}/10 題：${item.prompt}`; wrap.append(prompt); const answer = fillBlank(wrap); button(wrap, '作答', () => { if (gradeAnswer(answer.value, item.answer).correct) score++; q++; render(); }); return; }
  if (screen === 'settings') { title.textContent = '設定與存檔'; const note = document.createElement('p'); note.textContent = hasMalayVoice() ? '已找到馬來語朗讀語音（ms-MY 優先，否則 id-ID）。' : '此裝置沒有馬來語朗讀語音；遊戲仍可正常遊玩。'; wrap.append(note); button(wrap, '下載存檔', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportSave(state)], { type: 'application/json' })); a.download = 'kawan-save.json'; a.click(); URL.revokeObjectURL(a.href); }); const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json'; file.addEventListener('change', async () => { const result = importSave(await file.files[0].text()); if (result.valid) { state = result.state; persist(); render(); } else alert('存檔格式無效'); }); wrap.append(file); button(wrap, '返回', () => go('title')); return; }
}
window.addEventListener('keydown', (event) => { if (['1', '2', '3', '4'].includes(event.key)) [...root.querySelectorAll('button')][Number(event.key) - 1]?.click(); }); render();
