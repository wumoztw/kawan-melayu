import { createGame, dispatch, view } from './engine/game.js';
import { loadFromStorage, saveToStorage } from './engine/save.js';

const root = document.querySelector('#app');
let game = { state: loadFromStorage() || createGame().state, screen: 'briefing', result: null };
let feedback = '';

function persist() {
  try {
    saveToStorage(game.state);
  } catch {
    feedback = '無法儲存於此瀏覽器。';
  }
}

function button(parent, label, action, index) {
  const element = document.createElement('button');
  element.textContent = label;
  if (index) element.dataset.choice = String(index);
  element.addEventListener('click', action);
  parent.append(element);
  return element;
}

function act(intent) {
  game = dispatch(game, intent);
  persist();
  render();
}

function render() {
  root.replaceChildren();
  const page = document.createElement('section');
  page.className = 'game';
  root.append(page);
  const title = document.createElement('h1');
  title.textContent = 'Kawan Melayu｜便利商店馬來語';
  page.append(title);
  const status = document.createElement('p');
  status.textContent = `第 ${game.state.day} 天 · 現金 RM ${game.state.cash} · 經驗 ${game.state.experience}`;
  page.append(status);
  const model = view(game);
  const heading = document.createElement('h2');
  heading.textContent = model.demoEnd ? '試玩結束' : model.title;
  page.append(heading);
  const story = document.createElement('p');
  story.textContent = model.demoEnd ? '你已完成前三天體驗，單字已加入單字本。' : `${model.story} ${model.dialogue}`;
  page.append(story);
  if (game.screen === 'briefing' || game.screen === 'summary') {
    const instruction = document.createElement('p');
    instruction.textContent = game.screen === 'summary' ? `顧客回應：${game.result ? '答對了！' : '再接再厲！'}` : '準備好迎接今天的顧客了嗎？';
    page.append(instruction);
    button(page, '開始營業', () => act({ type: 'START_DAY' }), 1);
  } else if (game.screen === 'customer') {
    const speech = document.createElement('p');
    speech.textContent = model.question.line;
    page.append(speech);
    const prompt = document.createElement('p');
    prompt.textContent = model.question.prompt;
    page.append(prompt);
    model.question.acceptedAnswers.slice(0, 4).forEach((answer, index) => {
      button(page, `${index + 1}. ${answer}`, () => act({ type: 'ANSWER', value: answer }), index + 1);
    });
    button(page, '缺貨：記錄未能供應', () => act({ type: 'OUT_OF_STOCK' }));
    const inventory = document.createElement('p');
    inventory.textContent = `庫存 ${model.question.productName}：${model.inventory[model.question.productId] || 0}`;
    page.append(inventory);
  } else {
    button(page, '重新開始', () => {
      game = createGame();
      feedback = '';
      persist();
      render();
    }, 1);
  }
  if (!model.demoEnd) button(page, 'Mak Cik 幫助', () => act({ type: 'MAK_CIK_HELP' }));
  if (model.words.length) {
    const wordList = document.createElement('p');
    wordList.textContent = `單字本：${model.words.join('、')}`;
    page.append(wordList);
  }
  button(page, '儲存進度', () => {
    act({ type: 'SAVE' });
    feedback = '進度已儲存。';
    render();
  });
  const notice = document.createElement('p');
  notice.setAttribute('role', 'status');
  notice.textContent = feedback;
  page.append(notice);
}

window.addEventListener('keydown', (event) => {
  if (!['1', '2', '3', '4'].includes(event.key)) return;
  root.querySelector(`[data-choice="${event.key}"]`)?.click();
});
render();
