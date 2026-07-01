import type { Player, Pot } from './types';
import { isContender } from './util';

/**
 * Build the main pot + side pots from each player's total hand contribution.
 *
 * Layering: walk the distinct contribution levels from low to high. Each level
 * "slice" is funded by every player who reached it (INCLUDING folded players —
 * their chips are dead money in the pot), but only non-folded contenders are
 * eligible to win it. Adjacent slices with the same eligible set are merged so
 * the pot list stays short and readable.
 *
 * Assumes uncalled bets have already been returned (see engine.returnUncalled),
 * so every slice has at least one eligible contender at showdown.
 */
export function buildPots(players: Player[]): Pot[] {
  const contributors = players.filter((p) => p.committedThisHand > 0);
  if (contributors.length === 0) return [];

  const levels = [...new Set(contributors.map((p) => p.committedThisHand))].sort(
    (a, b) => a - b,
  );

  type Layer = { amount: number; eligible: string[] };
  const layers: Layer[] = [];
  let prev = 0;
  for (const lvl of levels) {
    const thickness = lvl - prev;
    const reaching = contributors.filter((p) => p.committedThisHand >= lvl);
    const amount = thickness * reaching.length;
    const eligible = reaching.filter(isContender).map((p) => p.id);
    if (amount <= 0) {
      prev = lvl;
      continue;
    }
    if (eligible.length === 0) {
      // Dead-money slice with no eligible winner (defensive — shouldn't occur
      // after uncalled-bet return). Fold the chips into the previous pot.
      if (layers.length) layers[layers.length - 1].amount += amount;
    } else {
      layers.push({ amount, eligible });
    }
    prev = lvl;
  }

  // Merge adjacent layers whose eligible sets are identical.
  const merged: Layer[] = [];
  for (const layer of layers) {
    const last = merged[merged.length - 1];
    if (last && sameSet(last.eligible, layer.eligible)) {
      last.amount += layer.amount;
    } else {
      merged.push({ amount: layer.amount, eligible: [...layer.eligible] });
    }
  }

  return merged.map((layer, i) => ({
    amount: layer.amount,
    eligible: layer.eligible,
    label: i === 0 ? 'Main pot' : `Side pot ${i}`,
  }));
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}

/**
 * Split `amount` chips among `winnersOrdered` (already ordered for odd-chip
 * priority — typically first eligible seat left of the button). Returns a map
 * of player id -> chips. The base share is floored; leftover odd chips go one
 * each to the earliest winners.
 */
export function splitAmount(
  amount: number,
  winnersOrdered: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  const n = winnersOrdered.length;
  if (n === 0) return out;
  const base = Math.floor(amount / n);
  let remainder = amount - base * n;
  for (const id of winnersOrdered) {
    out[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return out;
}
