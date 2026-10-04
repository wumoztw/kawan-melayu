export function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim();
}
export function gradeAnswer(answer, accepted) {
  const variants = Array.isArray(accepted) ? accepted : [accepted];
  const normalized = normalizeAnswer(answer);
  const correct = variants.some((variant) => normalizeAnswer(variant) === normalized);
  return { correct, answer, normalized, matched: correct ? variants.find((variant) => normalizeAnswer(variant) === normalized) : null };
}
