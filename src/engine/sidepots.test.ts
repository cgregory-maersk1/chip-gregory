import { describe, it, expect } from 'vitest';
import { buildPots, splitAmount } from './sidepots';
import type { Player } from './types';

function player(id: string, committed: number, folded = false): Player {
  return {
    id,
    name: id,
    seat: Number(id.slice(1)),
    stack: 0,
    totalInvested: 0,
    status: folded ? 'folded' : 'active',
    committedThisStreet: 0,
    committedThisHand: committed,
    hasActedThisStreet: false,
  };
}

describe('buildPots', () => {
  it('makes a single pot when everyone matched', () => {
    const pots = buildPots([player('p0', 100), player('p1', 100), player('p2', 100)]);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligible.sort()).toEqual(['p0', 'p1', 'p2']);
  });

  it('creates a side pot when one player is all-in for less', () => {
    // p0 all-in 50, p1 & p2 to 200
    const pots = buildPots([player('p0', 50), player('p1', 200), player('p2', 200)]);
    expect(pots).toHaveLength(2);
    expect(pots[0]).toMatchObject({ amount: 150, label: 'Main pot' });
    expect(pots[0].eligible.sort()).toEqual(['p0', 'p1', 'p2']);
    expect(pots[1]).toMatchObject({ amount: 300, label: 'Side pot 1' });
    expect(pots[1].eligible.sort()).toEqual(['p1', 'p2']);
  });

  it("includes a folded player's chips as dead money but not as eligible", () => {
    const pots = buildPots([
      player('p0', 100, true), // folded
      player('p1', 100),
      player('p2', 100),
    ]);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(300); // folded chips still in the pot
    expect(pots[0].eligible.sort()).toEqual(['p1', 'p2']); // folded p0 not eligible
  });

  it('handles two all-in levels producing two side pots', () => {
    // p0 25 (allin), p1 60 (allin), p2 100, p3 100
    const players = [
      { ...player('p0', 25), status: 'allIn' as const },
      { ...player('p1', 60), status: 'allIn' as const },
      player('p2', 100),
      player('p3', 100),
    ];
    const pots = buildPots(players);
    // level 25: 4*25=100 (all); level 60: 35*3=105 (p1,p2,p3); level 100: 40*2=80 (p2,p3)
    expect(pots.map((p) => p.amount)).toEqual([100, 105, 80]);
    expect(pots[0].eligible.sort()).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(pots[1].eligible.sort()).toEqual(['p1', 'p2', 'p3']);
    expect(pots[2].eligible.sort()).toEqual(['p2', 'p3']);
    const total = pots.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(25 + 60 + 100 + 100);
  });
});

describe('splitAmount', () => {
  it('splits evenly', () => {
    expect(splitAmount(300, ['a', 'b', 'c'])).toEqual({ a: 100, b: 100, c: 100 });
  });
  it('gives odd chips to the earliest winners', () => {
    expect(splitAmount(301, ['a', 'b'])).toEqual({ a: 151, b: 150 });
    expect(splitAmount(302, ['a', 'b', 'c'])).toEqual({ a: 101, b: 101, c: 100 });
  });
});
