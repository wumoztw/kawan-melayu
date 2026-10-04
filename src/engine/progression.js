export const MAX_LEVEL = 10;
export const EXPERIENCE_PER_LEVEL = 100;
export function levelForExperience(experience) { return Math.min(MAX_LEVEL, Math.max(1, Math.floor(Math.max(0, experience) / EXPERIENCE_PER_LEVEL) + 1)); }
export function periodForLevel(level) { return level <= 3 ? '初期' : level <= 6 ? '中期' : '高期'; }
export function addExperience(state, amount) {
  const experience = Math.max(0, (state.experience || 0) + Math.max(0, amount));
  const level = levelForExperience(experience);
  return { ...state, experience, level, period: periodForLevel(level) };
}
export function gradeGraduationExam(answers, questions = answers || []) {
  const total = questions.length;
  const correct = questions.reduce((count, question, index) => count + (typeof question === 'boolean' ? Number(question) : Number(question.correct ?? answers?.[index]?.correct ?? false)), 0);
  const percentage = total ? correct / total * 100 : 0;
  return { total, correct, percentage, passed: total === 10 && percentage >= 70 };
}
