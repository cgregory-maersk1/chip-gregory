import type { GameState, Player } from './types';

/** Deep clone game state (engine stays pure — never mutate the input). */
export function clone(state: GameState): GameState {
  return structuredClone(state);
}

/** Players who took a seat this hand (dealt in): active, all-in, or folded. */
export function dealtIn(p: Player): boolean {
  return p.status === 'active' || p.status === 'allIn' || p.status === 'folded';
}

/** Contenders still able to win the pot: active or all-in (not folded). */
export function isContender(p: Player): boolean {
  return p.status === 'active' || p.status === 'allIn';
}

/**
 * Can this player be dealt into a new hand? Requires chips and not opted out.
 * Sitting-out players stay out until they explicitly sit back in (sitIn).
 */
export function canPlay(p: Player): boolean {
  return p.stack > 0 && p.status !== 'cashedOut' && p.status !== 'sittingOut';
}

/**
 * Seat index of the next player (after `fromSeat`, exclusive, cycling) that
 * satisfies `pred`. Returns -1 if none.
 */
export function nextSeat(
  players: Player[],
  fromSeat: number,
  pred: (p: Player) => boolean,
): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (fromSeat + i) % n;
    if (pred(players[seat])) return seat;
  }
  return -1;
}
