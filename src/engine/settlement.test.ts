import { describe, it, expect } from 'vitest';
import { computeSettlement } from './settlement';
import type { Player } from './types';

function p(id: string, invested: number, stack: number): Player {
  return {
    id, name: id, seat: Number(id.slice(1)), stack, totalInvested: invested,
    status: 'active', committedThisStreet: 0, committedThisHand: 0, hasActedThisStreet: false,
  };
}

describe('computeSettlement', () => {
  it('computes nets and a minimal set of payments', () => {
    const players = [p('p0', 100, 250), p('p1', 100, 50), p('p2', 100, 0)];
    const s = computeSettlement(players, 0.05);

    expect(s.balanced).toBe(true);
    expect(s.nets.find((n) => n.id === 'p0')!.netChips).toBe(150);
    expect(s.nets.find((n) => n.id === 'p1')!.netChips).toBe(-50);
    expect(s.nets.find((n) => n.id === 'p2')!.netChips).toBe(-100);

    // Two debtors both pay the single creditor p0.
    expect(s.payments).toHaveLength(2);
    const toP0 = s.payments.filter((x) => x.toId === 'p0');
    expect(toP0.reduce((sum, x) => sum + x.chips, 0)).toBe(150);
    expect(s.payments.find((x) => x.fromId === 'p2')!.dollars).toBeCloseTo(5.0);
    expect(s.payments.find((x) => x.fromId === 'p1')!.dollars).toBeCloseTo(2.5);
  });

  it('flags an unbalanced table (chips created/destroyed)', () => {
    const players = [p('p0', 100, 130), p('p1', 100, 100)];
    expect(computeSettlement(players, 1).balanced).toBe(false);
  });

  it('produces no payments when everyone is even', () => {
    const players = [p('p0', 100, 100), p('p1', 100, 100)];
    const s = computeSettlement(players, 1);
    expect(s.payments).toHaveLength(0);
    expect(s.balanced).toBe(true);
  });
});
