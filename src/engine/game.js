import { createInitialState, normalizeState } from './state.js';
import { gradeAnswer } from './grading.js';
import { restock, sell } from './economy.js';
import { reviewWord } from './vocab.js';
import { generateDay } from './generator.js';
import { scriptForDay } from './script.js';

function dayData(state) {
  return state.day === 2 || state.day === 3 ? generateDay(state.day, state) : scriptForDay(state.day);
}

export function createGame(options = {}) {
  const state = normalizeState(createInitialState(options));
  return { state, screen: 'briefing', result: null };
}

export function view(game) {
  const day = dayData(game.state);
  return {
    screen: game.screen,
    day: game.state.day,
    title: day.title,
    story: day.story,
    dialogue: day.dialogue || '',
    question: day.question,
    result: game.result,
    cash: game.state.cash,
    inventory: game.state.inventory,
    demoEnd: game.state.day > 3,
    words: Object.keys(game.state.vocab),
  };
}

export function dispatch(game, intent) {
  let state = game.state;
  if (intent.type === 'RESTORE') return { ...game, state: normalizeState(intent.save) };
  if (intent.type === 'START_DAY') {
    const data = dayData(state);
    const { productId, buyPrice } = data.question;
    if ((data.autoRestock || state.day === 1) && (state.inventory[productId] || 0) < 1 && state.cash >= buyPrice) {
      state = restock(state, productId, 1, buyPrice);
    }
    return { ...game, state, screen: 'customer', result: null };
  }
  if (intent.type === 'MAK_CIK_HELP') {
    return { ...game, state: { ...state, flags: { ...state.flags, makCikHelped: true } } };
  }
  if (['ANSWER', 'OUT_OF_STOCK'].includes(intent.type) && game.screen === 'customer') {
    const question = dayData(state).question;
    const inStock = (state.inventory[question.productId] || 0) > 0;
    const grade = gradeAnswer(intent.value, question.acceptedAnswers);
    const correct = grade.correct && inStock && intent.type !== 'OUT_OF_STOCK';
    if (correct) state = sell(state, question.productId, 1, question.sellPrice);
    state = reviewWord(state, question.productId, correct);
    state = {
      ...state,
      experience: state.experience + (correct ? 10 : 2),
      reputation: state.reputation + (correct ? 1 : 0),
      history: [...state.history, { day: state.day, answer: String(intent.value ?? ''), correct, inStock }],
      day: state.day + 1,
    };
    return { ...game, state, screen: state.day > 3 ? 'demoEnd' : 'summary', result: correct };
  }
  if (intent.type === 'SAVE') return { ...game, save: JSON.stringify(state) };
  return game;
}

export { generateDay };
