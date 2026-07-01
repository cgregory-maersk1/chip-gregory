import { describe, it, expect } from 'vitest';
import { createGame, startHand, awardShowdown, DEFAULT_CONFIG } from './engine';
import { applyAction, legalActions } from './betting';
import type { GameConfig, GameState, ActionType } from './types';

const CFG: GameConfig = { ...DEFAULT_CONFIG, smallBlind: 1, bigBlind: 2 };

function deal(stacks: number[]): GameState {
  const players = stacks.map((s, i) => ({ name: `P${i}`, buyIn: s }));
  return startHand(createGame(players, CFG));
}
function act(s: GameState, type: ActionType, amount?: number): GameState {
  return applyAction(s, { type, amount });
}
const stackOf = (s: GameState, seat: number) => s.players[seat].stack;

describe('hand setup', () => {
  it('posts blinds and sets first actor (3-handed)', () => {
    const s = deal([200, 200, 200]);
    expect(s.dealerSeat).toBe(0);
    expect(s.hand!.sbSeat).toBe(1);
    expect(s.hand!.bbSeat).toBe(2);
    expect(s.hand!.actingSeat).toBe(0); // UTG
    expect(stackOf(s, 1)).toBe(199); // posted SB
    expect(stackOf(s, 2)).toBe(198); // posted BB
    expect(s.hand!.currentBet).toBe(2);
  });

  it('heads-up: button is SB and acts first preflop, BB first postflop', () => {
    let s = deal([200, 200]);
    expect(s.hand!.sbSeat).toBe(0);
    expect(s.hand!.bbSeat).toBe(1);
    expect(s.hand!.actingSeat).toBe(0);
    s = act(s, 'call'); // button completes
    s = act(s, 'check'); // BB checks option -> flop
    expect(s.hand!.street).toBe('flop');
    expect(s.hand!.actingSeat).toBe(1); // BB acts first postflop
  });
});

describe('legal actions', () => {
  it('offers check when nothing to call, call otherwise', () => {
    const s = deal([200, 200, 200]);
    const la = legalActions(s); // UTG facing bb 2
    expect(la.canCheck).toBe(false);
    expect(la.canCall).toBe(true);
    expect(la.toCall).toBe(2);
    expect(la.minRaiseTo).toBe(4); // raise to at least 2 + bb
  });
});

describe('fold-out win', () => {
  it('awards the pot immediately and returns the uncalled raise', () => {
    let s = deal([200, 200, 200]);
    s = act(s, 'raise', 6); // UTG raises to 6
    s = act(s, 'fold'); // SB folds
    s = act(s, 'fold'); // BB folds
    expect(s.phase).toBe('handEnd');
    // UTG wins SB(1)+BB(2)=3; uncalled 4 returned
    expect(stackOf(s, 0)).toBe(203);
    expect(stackOf(s, 1)).toBe(199);
    expect(stackOf(s, 2)).toBe(198);
    expect(s.history).toHaveLength(1);
  });
});

describe('full hand to showdown', () => {
  it('runs checks through the streets and awards the single pot', () => {
    let s = deal([200, 200, 200]);
    s = act(s, 'call'); // UTG
    s = act(s, 'call'); // SB completes
    s = act(s, 'check'); // BB option -> flop
    expect(s.hand!.street).toBe('flop');
    // flop, turn, river: everyone checks
    for (const _ of [0, 1, 2]) {
      s = act(s, 'check');
      s = act(s, 'check');
      s = act(s, 'check');
    }
    expect(s.phase).toBe('showdown');
    expect(s.hand!.pots).toHaveLength(1);
    expect(s.hand!.pots[0].amount).toBe(6);
    s = awardShowdown(s, [['p0']]);
    expect(stackOf(s, 0)).toBe(204);
    expect(stackOf(s, 1)).toBe(198);
    expect(stackOf(s, 2)).toBe(198);
  });
});

describe('all-in side pots end to end', () => {
  it('builds main + side pot and pays the right players', () => {
    let s = deal([50, 200, 200]); // P0 short
    // preflop
    s = act(s, 'allin'); // P0 all-in to 50
    s = act(s, 'call'); // P1 (SB) calls 50
    s = act(s, 'call'); // P2 (BB) calls 50
    expect(s.hand!.street).toBe('flop');
    // flop: P1 bets 20, P2 calls
    s = act(s, 'bet', 20);
    s = act(s, 'call');
    // turn + river checks
    s = act(s, 'check');
    s = act(s, 'check');
    s = act(s, 'check');
    s = act(s, 'check');
    expect(s.phase).toBe('showdown');
    const pots = s.hand!.pots;
    expect(pots.map((p) => p.amount)).toEqual([150, 40]);
    expect(pots[0].eligible.sort()).toEqual(['p0', 'p1', 'p2']);
    expect(pots[1].eligible.sort()).toEqual(['p1', 'p2']);

    // Main pot -> P0, side pot -> P1
    s = awardShowdown(s, [['p0'], ['p1']]);
    expect(stackOf(s, 0)).toBe(150);
    expect(stackOf(s, 1)).toBe(170);
    expect(stackOf(s, 2)).toBe(130);
    const total = s.players.reduce((sum, p) => sum + p.stack, 0);
    expect(total).toBe(450);
  });
});

describe('split pot with odd chip', () => {
  it('splits a pot and gives the odd chip to the earliest seat left of button', () => {
    let s = deal([200, 200, 200]); // pot will be 6 after checks
    s = act(s, 'raise', 3); // UTG makes it 3 to build an odd pot
    s = act(s, 'call'); // SB calls to 3
    s = act(s, 'call'); // BB calls to 3
    // pot now 9; check down
    for (const _ of [0, 1, 2]) {
      s = act(s, 'check');
      s = act(s, 'check');
      s = act(s, 'check');
    }
    expect(s.hand!.pots[0].amount).toBe(9);
    // Split main pot between SB(seat1) and BB(seat2). Button=0, so seat1 is first left.
    s = awardShowdown(s, [['p1', 'p2']]);
    // 9 / 2 = 4 each + odd chip to seat1
    expect(s.players[1].stack).toBe(197 + 5); // invested 3, +5
    expect(s.players[2].stack).toBe(197 + 4);
  });
});

describe('raise reopens action', () => {
  it('lets a player re-raise after being raised', () => {
    let s = deal([200, 200, 200]);
    s = act(s, 'raise', 6); // UTG to 6
    s = act(s, 'raise', 14); // SB re-raises to 14
    // action reopened: BB and UTG must act again
    expect(s.hand!.actingSeat).toBe(2); // BB to act
    const la = legalActions(s);
    expect(la.toCall).toBe(14 - 2); // BB already has 2 in
  });
});
