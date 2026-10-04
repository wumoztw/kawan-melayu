const GRAMMAR = new Set(['ok', 'minor', 'major']);
export function validateAssessment(value) {
  let data;
  try { data = typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; }
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.correct !== 'boolean' || !GRAMMAR.has(data.grammar) || !Number.isInteger(data.naturalness) || data.naturalness < 0 || data.naturalness > 2 || typeof data.feedback !== 'string') return null;
  return { correct: data.correct, grammar: data.grammar, naturalness: data.naturalness, feedback: data.feedback.slice(0, 500) };
}
export function validateTextResponse(value) {
  let data;
  try { data = typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; }
  return data && typeof data === 'object' && typeof data.text === 'string' ? { text: data.text.slice(0, 1000) } : null;
}
