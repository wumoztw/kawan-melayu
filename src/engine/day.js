import { PHASES } from './state.js';

export function advanceDay(state) {
  const phaseIndex = PHASES.indexOf(state.phase);
  if (phaseIndex < 0) throw new Error(`Unknown phase: ${state.phase}`);
  const nextPhase = PHASES[(phaseIndex + 1) % PHASES.length];
  return { ...state, phase: nextPhase, day: state.day + (state.phase === 'CLOSE' ? 1 : 0) };
}

export function transitionTo(state, phase) {
  if (!PHASES.includes(phase)) throw new Error(`Unknown phase: ${phase}`);
  if (phase === 'BRIEFING' && state.phase === 'CLOSE') return { ...state, phase, day: state.day + 1 };
  if (PHASES.indexOf(phase) !== PHASES.indexOf(state.phase) + 1) throw new Error(`Invalid transition: ${state.phase} -> ${phase}`);
  return { ...state, phase };
}
