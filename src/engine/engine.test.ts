import { describe, it, expect } from 'vitest';
import {
  createGame, startHand, addChips, cashOut, sitOut,
  serialize, deserialize, currentPot, canStartHand, DEFAULT_CONFIG,
} from './engine';
import type { GameConfig } from './types';

const CFG: GameConfig = { ...DEFAULT_CONFIG, smallBlind: 1, bigBlind: 2, defaultBuyIn: 200 };

describe('createGame', () => {
  it('seats players with the default buy-in', () => {
    const g = createGame([{ name: 'Al' }, { name: 'Bea' }], CFG);
    expect(g.phase).toBe('setup');
    expect(g.players).toHaveLength(2);
    expect(g.players[0]).toMatchObject({ name: 'Al', stack: 200, totalInvested: 200 });
  });
  it('honors per-player buy-ins and names empty entries', () => {
    const g = createGame([{ name: '', buyIn: 500 }, { name: 'Bea' }], CFG);
    expect(g.players[0].name).toBe('Player 1');
    expect(g.players[0].stack).toBe(500);
  });
});

describe('serialize / deserialize', () => {
  it('round-trips exactly', () => {
    const g = startHand(createGame([{ name: 'Al' }, { name: 'Bea' }, { name: 'Cy' }], CFG));
    const back = deserialize(serialize(g));
    expect(back).toEqual(g);
  });
  it('rejects garbage and version mismatch', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize(JSON.stringify({ version: 999 }))).toBeNull();
  });
});

describe('rebuys and table management', () => {
  it('adds chips to stack and total invested', () => {
    let g = createGame([{ name: 'Al' }, { name: 'Bea' }], CFG);
    g = addChips(g, 0, 100);
    expect(g.players[0].stack).toBe(300);
    expect(g.players[0].totalInvested).toBe(300);
  });
  it('cashing out records the player as gone', () => {
    let g = createGame([{ name: 'Al' }, { name: 'Bea' }], CFG);
    g = cashOut(g, 0);
    expect(g.players[0].status).toBe('cashedOut');
  });
  it('needs two players with chips to deal', () => {
    let g = createGame([{ name: 'Al' }, { name: 'Bea' }], CFG);
    g = sitOut(g, 1);
    expect(canStartHand(g)).toBe(false);
  });
});

describe('currentPot', () => {
  it('sums committed chips during a hand', () => {
    const g = startHand(createGame([{ name: 'Al' }, { name: 'Bea' }, { name: 'Cy' }], CFG));
    expect(currentPot(g)).toBe(3); // SB 1 + BB 2
  });
});
