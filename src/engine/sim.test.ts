import { describe, it, expect } from 'vitest';
import { createGame, startHand, awardShowdown, canStartHand, DEFAULT_CONFIG } from './engine';
import { applyAction, legalActions } from './betting';
import type { GameConfig, GameState, PlayerAction } from './types';

// Deterministic PRNG so failures are reproducible (no Math.random).
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const CFG: GameConfig = { ...DEFAULT_CONFIG, smallBlind: 1, bigBlind: 2, defaultBuyIn: 100 };

function chooseAction(s: GameState, r: number): PlayerAction {
  const la = legalActions(s);
  if (la.canCheck) {
    if (r < 0.75 || !la.canAggress) return { type: 'check' };
    return { type: 'bet', amount: Math.min(la.maxTo, la.minRaiseTo) };
  }
  if (r < 0.15) return { type: 'fold' };
  if (r < 0.8 || !la.canAggress) return { type: 'call' };
  if (la.maxTo >= la.minRaiseTo) {
    const amount = Math.min(la.maxTo, la.minRaiseTo + Math.floor((la.maxTo - la.minRaiseTo) * r));
    return { type: la.isOpen ? 'bet' : 'raise', amount };
  }
  return { type: 'allin' };
}

function playHand(start: GameState, rnd: () => number): GameState {
  let s = start;
  let guard = 0;
  while (s.phase === 'hand') {
    if (guard++ > 1000) throw new Error('betting round did not resolve (stuck)');
    s = applyAction(s, chooseAction(s, rnd()));
  }
  if (s.phase === 'showdown') {
    // Award each pot to its first eligible player.
    s = awardShowdown(s, s.hand!.pots.map((p) => [p.eligible[0]]));
  }
  return s;
}

describe('full-game simulation', () => {
  it('never gets stuck and always conserves chips (many seeds)', () => {
    const totalChips = 4 * CFG.defaultBuyIn;
    for (let seed = 1; seed <= 40; seed++) {
      const rnd = lcg(seed);
      let s = createGame(
        [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
        CFG,
      );
      let hands = 0;
      while (canStartHand(s) && hands < 400) {
        s = startHand(s);
        s = playHand(s, rnd);
        // After any hand the game must be ready for the next deal.
        expect(s.phase).toBe('handEnd');
        expect(s.hand).toBeNull();
        // Chips are never created or destroyed.
        const total = s.players.reduce((a, p) => a + p.stack, 0);
        expect(total).toBe(totalChips);
        hands++;
      }
      expect(hands).toBeGreaterThan(0);
    }
  });

  it('heads-up games also resolve every hand', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rnd = lcg(seed * 7 + 1);
      let s = createGame([{ name: 'A' }, { name: 'B' }], CFG);
      let hands = 0;
      while (canStartHand(s) && hands < 400) {
        s = startHand(s);
        s = playHand(s, rnd);
        expect(s.phase).toBe('handEnd');
        expect(s.players.reduce((a, p) => a + p.stack, 0)).toBe(2 * CFG.defaultBuyIn);
        hands++;
      }
      expect(hands).toBeGreaterThan(0);
    }
  });
});
