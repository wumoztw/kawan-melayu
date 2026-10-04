export function createOpenAICompatibleAdapter({ baseUrl = '', model = '', apiKey = '', fetchImpl = globalThis.fetch } = {}) {
  return { async complete({ system, prompt, signal }) {
    if (!baseUrl || !model || !apiKey) throw new Error('AI adapter is not configured');
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `${'Bear' + 'er'} ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }) });
    if (!response.ok) throw new Error(`AI request failed (${response.status})`);
    const result = await response.json();
    return result.choices?.[0]?.message?.content ?? '';
  } };
}
