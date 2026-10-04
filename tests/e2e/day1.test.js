import { describe, expect, it } from 'vitest';
import { createGame, dispatch, view } from '../../src/engine/game.js';

describe('Day 1 playable journey', () => {
  it('supports a perfect player from briefing through close and rewards vocabulary', () => {
    let game = createGame({ seed: 7 });
    expect(view(game).screen).toBe('briefing');
    game = dispatch(game, { type: 'START_DAY' });
    const question = view(game).question;
    game = dispatch(game, { type: 'ANSWER', value: question.acceptedAnswers[0] });
    expect(view(game).screen).toBe('summary');
    expect(game.state.history).toHaveLength(1);
    expect(Object.keys(game.state.vocab).length).toBeGreaterThan(0);
    expect(game.state.cash).toBeGreaterThan(100);
  });

  it('does not award a blank answer and records a wrong answer', () => {
    let game = createGame({ seed: 3 });
    game = dispatch(game, { type: 'START_DAY' });
    game = dispatch(game, { type: 'ANSWER', value: '' });
    expect(game.state.history[0].correct).toBe(false);
    expect(game.state.cash).toBe(98);
  });

  it('handles out of stock and save/restore', () => {
    let game = createGame({ cash: 0 });
    game = dispatch(game, { type: 'START_DAY' });
    game = dispatch(game, { type: 'OUT_OF_STOCK' });
    expect(game.state.history[0]).toMatchObject({ correct: false, inStock: false });
    const resumed = dispatch(game, { type: 'RESTORE', save: JSON.parse(JSON.stringify(game.state)) });
    expect(resumed.state.day).toBe(2);
    expect(resumed.state.history).toHaveLength(1);
  });

  it('generates days two and three with paid restock and Mak Cik dialogue', () => {
    let game = createGame();
    game = dispatch(game, { type: 'MAK_CIK_HELP' });
    game.state.day = 2;
    game = dispatch(game, { type: 'START_DAY' });
    expect(game.state.cash).toBeLessThan(100);
    expect(view(game).dialogue).toContain('Mak Cik');
  });

  it('ends the demo after day three', () => {
    let game = createGame();
    game.state.day = 3;
    game = dispatch(game, { type: 'START_DAY' });
    game = dispatch(game, { type: 'ANSWER', value: view(game).question.acceptedAnswers[0] });
    expect(view(game).demoEnd).toBe(true);
    expect(view(game).screen).toBe('demoEnd');
  });
});
