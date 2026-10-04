import { scriptForDay } from './script.js';

export function generateDay(day, state = {}) {
  if (day < 2 || day > 3) throw new RangeError('Rule generator supports days 2 and 3');
  const script = scriptForDay(day);
  const makCik = Boolean(state.flags?.makCikHelped);
  return {
    ...script,
    autoRestock: true,
    dialogue: makCik
      ? 'Mak Cik：Bagus, kamu selalu membantu jiran!（你總是幫助鄰居，真好！）'
      : 'Mak Cik：Selamat pagi!（早安！）',
  };
}
