import { createOpenAICompatibleAdapter } from './adapters/openaiCompatible.js';
import { SYSTEM_PROMPTS, makePrompt } from './prompts.js';
import { validateAssessment, validateTextResponse } from './validate.js';
import { getCached, setCached, waitForRequestInterval } from './cache.js';

export class AIService {
  constructor({ mode = 'off', adapter, baseUrl, model, apiKey, timeoutMs = 10000 } = {}) {
    this.mode = mode;
    this.adapter = adapter || (mode === 'off' ? null : createOpenAICompatibleAdapter({ baseUrl, model, apiKey }));
    this.timeoutMs = Math.min(10000, timeoutMs);
  }
  async request(task, input, fallback, validate = validateTextResponse, cacheKey) {
    if (cacheKey) { const cached = getCached(cacheKey); if (cached) return cached; }
    if (this.mode === 'off' || !this.adapter) return fallback;
    try {
      await waitForRequestInterval();
      const controller = new AbortController();
      let timer;
      try {
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('AI timeout')); }, this.timeoutMs); });
        const raw = await Promise.race([this.adapter.complete({ system: SYSTEM_PROMPTS.zh, prompt: makePrompt(task, input), signal: controller.signal }), timeout]);
        const result = validate(raw);
        if (result) { if (cacheKey) setCached(cacheKey, result); return result; }
      } finally { clearTimeout(timer); }
    } catch { /* AI is optional: preserve the offline experience. */ }
    return fallback;
  }
  assessReply(input, fallback = { correct: false, grammar: 'major', naturalness: 0, feedback: '請參考提示再試一次。' }) { return this.request('批改馬來語回答；回傳 correct、grammar、naturalness、feedback 欄位。', input, fallback, validateAssessment); }
  explainMistake(input, fallback = { text: '請留意句型與用詞，再參考範例練習。' }) { return this.request('解釋回答錯誤並提供改善建議。', input, fallback, validateTextResponse, `explain:${JSON.stringify(input)}`); }
  chatWithRegular(input, fallback = { text: 'Mari berbual! 今天生意還不錯，謝謝你。' }) { return this.request('以友善常客身分自然閒聊。', input, fallback); }
}
export const defaultAIService = new AIService({ mode: 'off' });
export default AIService;
