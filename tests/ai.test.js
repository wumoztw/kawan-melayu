import { describe, expect, it, vi } from 'vitest';
import { AIService } from '../src/ai/index.js';
import { validateAssessment } from '../src/ai/validate.js';

describe('AIService graceful degradation', () => {
  const fallback = { correct: false, grammar: 'major', naturalness: 0, feedback: '預寫提示' };
  it('returns fallback when disabled or provider throws', async () => {
    expect(await new AIService().assessReply('你好', fallback)).toEqual(fallback);
    const adapter = { complete: vi.fn().mockRejectedValue(new Error('offline')) };
    expect(await new AIService({ mode: 'on', adapter }).assessReply('你好', fallback)).toEqual(fallback);
  });
  it('returns fallback on timeout and malformed response', async () => {
    const never = { complete: () => new Promise(() => {}) };
    expect(await new AIService({ mode: 'on', adapter: never, timeoutMs: 5 }).assessReply('測試', fallback)).toEqual(fallback);
    const invalid = { complete: async () => '{"grammar":"excellent"}' };
    expect(await new AIService({ mode: 'on', adapter: invalid }).assessReply('測試', fallback)).toEqual(fallback);
  });
  it('validates assessment contract strictly', () => {
    expect(validateAssessment('{"correct":true,"grammar":"minor","naturalness":2,"feedback":"不錯"}').grammar).toBe('minor');
    expect(validateAssessment({ correct: true, grammar: 'bad', naturalness: 3, feedback: 'x' })).toBeNull();
  });
  it('catches explain/chat provider failure', async () => {
    const service = new AIService({ mode: 'on', adapter: { complete: async () => { throw Error('failed'); } } });
    expect((await service.explainMistake('回答')).text).toContain('句型');
    expect((await service.chatWithRegular('嗨')).text).toContain('Mari');
  });
});
