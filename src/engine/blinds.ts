import type { GameConfig } from './types';

/**
 * Blind level for a given hand number (1-based) in "hands" escalation mode.
 * Level 0 = base blinds; every `interval` hands the blinds multiply by `factor`.
 * Minutes-mode escalation is time-driven and resolved by the store (which knows
 * elapsed time); this function only handles the hands schedule and the base case.
 */
export function blindsForHand(
  config: GameConfig,
  handNo: number,
): { sb: number; bb: number } {
  const { smallBlind, bigBlind, escalation } = config;
  if (!escalation.enabled || escalation.mode !== 'hands' || handNo < 1) {
    return { sb: smallBlind, bb: bigBlind };
  }
  const level = Math.floor((handNo - 1) / Math.max(1, escalation.interval));
  const mult = Math.pow(escalation.factor, level);
  return {
    sb: Math.round(smallBlind * mult),
    bb: Math.round(bigBlind * mult),
  };
}

/**
 * Blind level after `elapsedMinutes` in "minutes" escalation mode.
 * Every `interval` minutes the blinds multiply by `factor`.
 */
export function blindsForMinutes(
  config: GameConfig,
  elapsedMinutes: number,
): { sb: number; bb: number } {
  const { smallBlind, bigBlind, escalation } = config;
  if (!escalation.enabled || escalation.mode !== 'minutes') {
    return { sb: smallBlind, bb: bigBlind };
  }
  const level = Math.floor(elapsedMinutes / Math.max(1, escalation.interval));
  const mult = Math.pow(escalation.factor, level);
  return {
    sb: Math.round(smallBlind * mult),
    bb: Math.round(bigBlind * mult),
  };
}
