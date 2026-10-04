import days from '../data/days.json';
import { questionForDay } from './questions.js';

export function scriptForDay(day) {
  const entry = days.find((item) => item.day === day) || {
    day,
    title: `便利商店的第 ${day} 天`,
    story: '熟悉的街坊再次光臨，今天也一起練習馬來語。',
  };
  return { ...entry, question: questionForDay(day) };
}
