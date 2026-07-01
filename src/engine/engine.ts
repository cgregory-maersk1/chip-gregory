import type {
  GameConfig,
  GameState,
  HandState,
  Player,
  PlayerAction,
} from './types';
import { STATE_VERSION } from './types';
import { applyAction, finalizeHand, resolveStart } from './betting';
import { blindsForHand } from './blinds';
import { splitAmount } from './sidepots';
import { canPlay, clone, nextSeat } from './util';

export interface SetupPlayer {
  name: string;
  buyIn?: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  smallBlind: 1,
  bigBlind: 2,
  defaultBuyIn: 200,
  chipValue: 1,
  escalation: { enabled: false, mode: 'hands', interval: 10, factor: 2 },
};

/** Fresh game in the 'setup' phase with seated players. */
export function createGame(players: SetupPlayer[], config: GameConfig): GameState {
  const seated: Player[] = players.map((sp, i) => {
    const buyIn = sp.buyIn ?? config.defaultBuyIn;
    return {
      id: `p${i}`,
      name: sp.name.trim() || `Player ${i + 1}`,
      seat: i,
      stack: buyIn,
      totalInvested: buyIn,
      status: 'active',
      committedThisStreet: 0,
      committedThisHand: 0,
      hasActedThisStreet: false,
    };
  });
  return {
    version: STATE_VERSION,
    config,
    players: seated,
    dealerSeat: -1,
    handNo: 0,
    phase: 'setup',
    hand: null,
    currentBlinds: { sb: config.smallBlind, bb: config.bigBlind },
    log: [],
    history: [],
  };
}

/**
 * Start the next hand: rotate the button, post blinds, and set the first actor.
 * `blindsOverride` is used for minutes-mode escalation (the store knows elapsed
 * time); otherwise blinds are derived from the hand number.
 */
export function startHand(
  state: GameState,
  blindsOverride?: { sb: number; bb: number },
): GameState {
  const s = clone(state);
  const playable = s.players.filter(canPlay);
  if (playable.length < 2) throw new Error('Need at least 2 players with chips');

  s.handNo += 1;
  s.currentBlinds = blindsOverride ?? blindsForHand(s.config, s.handNo);
  const { bb } = s.currentBlinds;

  // Rotate the button to the next playable seat (first hand: first playable seat).
  s.dealerSeat =
    s.dealerSeat < 0
      ? playable[0].seat
      : nextSeat(s.players, s.dealerSeat, canPlay);

  // Reset every player for the new hand.
  for (const p of s.players) {
    p.committedThisStreet = 0;
    p.committedThisHand = 0;
    p.hasActedThisStreet = false;
    if (p.status === 'cashedOut') continue;
    p.status = canPlay(p) ? 'active' : 'sittingOut';
  }

  const inHand = s.players.filter((p) => p.status === 'active');
  const headsUp = inHand.length === 2;

  let sbSeat: number;
  let bbSeat: number;
  let firstToAct: number;
  if (headsUp) {
    // Button is the small blind and acts first preflop.
    sbSeat = s.dealerSeat;
    bbSeat = nextSeat(s.players, s.dealerSeat, (p) => p.status === 'active');
    firstToAct = sbSeat;
  } else {
    sbSeat = nextSeat(s.players, s.dealerSeat, (p) => p.status === 'active');
    bbSeat = nextSeat(s.players, sbSeat, (p) => p.status === 'active');
    firstToAct = nextSeat(s.players, bbSeat, (p) => p.status === 'active');
  }

  postBlind(s.players[sbSeat], s.currentBlinds.sb);
  postBlind(s.players[bbSeat], bb);

  const hand: HandState = {
    street: 'preflop',
    currentBet: bb,
    lastRaiseSize: bb,
    actingSeat: firstToAct,
    aggressorSeat: bbSeat,
    sbSeat,
    bbSeat,
    pots: [],
  };
  s.hand = hand;
  s.phase = 'hand';
  s.log = [];

  return resolveStart(s);
}

function postBlind(p: Player, amount: number): void {
  const amt = Math.min(amount, p.stack);
  p.stack -= amt;
  p.committedThisStreet += amt;
  p.committedThisHand += amt;
  if (p.stack === 0) p.status = 'allIn';
  // Posting a blind is not "acting" — the player still gets their option.
  p.hasActedThisStreet = false;
}

/**
 * Award the showdown pots. `winnersByPot[i]` lists the winning player ids for
 * pot i (multiple = split). Odd chips go to the earliest winner left of the
 * button. Validates each winner is eligible for that pot.
 */
export function awardShowdown(
  state: GameState,
  winnersByPot: string[][],
): GameState {
  const s = clone(state);
  const h = s.hand;
  if (!h || s.phase !== 'showdown') throw new Error('Not at showdown');
  if (winnersByPot.length !== h.pots.length) {
    throw new Error('Must choose winners for every pot');
  }

  const wonById: Record<string, number> = {};
  h.pots.forEach((pot, i) => {
    const winners = winnersByPot[i];
    if (!winners || winners.length === 0) throw new Error(`Pick a winner for ${pot.label}`);
    for (const id of winners) {
      if (!pot.eligible.includes(id)) throw new Error(`Winner not eligible for ${pot.label}`);
    }
    const ordered = orderForOddChip(s, winners);
    const shares = splitAmount(pot.amount, ordered);
    for (const [id, chips] of Object.entries(shares)) {
      wonById[id] = (wonById[id] ?? 0) + chips;
    }
  });

  return finalizeHand(s, wonById);
}

/** Order winner ids by seat, starting from the first seat left of the button. */
function orderForOddChip(s: GameState, winnerIds: string[]): string[] {
  const n = s.players.length;
  return [...winnerIds].sort((a, b) => {
    const sa = s.players.find((p) => p.id === a)!.seat;
    const sb = s.players.find((p) => p.id === b)!.seat;
    const ra = (sa - s.dealerSeat - 1 + n) % n;
    const rb = (sb - s.dealerSeat - 1 + n) % n;
    return ra - rb;
  });
}

/**
 * Add chips to a player (buy-in top-up or re-buy). Between hands only — table
 * stakes means you can't add to your stack mid-hand.
 */
export function addChips(state: GameState, seat: number, amount: number): GameState {
  if (amount <= 0) return state;
  if (state.phase === 'hand' || state.phase === 'showdown') return state;
  const s = clone(state);
  const p = s.players[seat];
  if (!p) throw new Error('No such seat');
  if (p.status === 'cashedOut') throw new Error('Player has cashed out');
  p.stack += amount;
  p.totalInvested += amount;
  if (p.status === 'sittingOut' && p.stack > 0) p.status = 'active';
  return s;
}

/**
 * Player leaves the table; their current stack is their final result. If they
 * leave mid-hand they're folded out of it and play continues (a stuck turn
 * pointer is repaired). Not allowed during showdown — award the pot first.
 */
export function cashOut(state: GameState, seat: number): GameState {
  if (state.phase === 'showdown') return state;
  const s = clone(state);
  const p = s.players[seat];
  if (!p) throw new Error('No such seat');
  p.status = 'cashedOut';
  if (s.phase === 'hand' && s.hand) return resolveStart(s);
  return s;
}

/** Sit a player out. Mid-hand this folds them and play continues. */
export function sitOut(state: GameState, seat: number): GameState {
  if (state.phase === 'showdown') return state;
  const s = clone(state);
  const p = s.players[seat];
  if (!p || p.status === 'cashedOut') return s;
  p.status = 'sittingOut';
  if (s.phase === 'hand' && s.hand) return resolveStart(s);
  return s;
}

/** Sit a player back in. Takes effect from the next hand (between hands only). */
export function sitIn(state: GameState, seat: number): GameState {
  if (state.phase === 'hand' || state.phase === 'showdown') return state;
  const s = clone(state);
  const p = s.players[seat];
  if (p && p.status === 'sittingOut' && p.stack > 0) p.status = 'active';
  return s;
}

/**
 * Repair a hand whose acting seat can no longer act (e.g. a player was cashed
 * out mid-hand under an older build). No-op for healthy states.
 */
export function healHand(state: GameState): GameState {
  if (
    state.phase === 'hand' &&
    state.hand &&
    state.players[state.hand.actingSeat]?.status !== 'active'
  ) {
    return resolveStart(state);
  }
  return state;
}

export function endGame(state: GameState): GameState {
  const s = clone(state);
  s.phase = 'gameOver';
  return s;
}

/** Return from the settlement screen to the table to keep playing. */
export function resumePlay(state: GameState): GameState {
  const s = clone(state);
  if (s.phase === 'gameOver') s.phase = s.hand ? 'hand' : 'handEnd';
  return s;
}

// --- Reducer (used by the store) ---

export type GameEvent =
  | { type: 'NEW_GAME'; players: SetupPlayer[]; config: GameConfig }
  | { type: 'START_HAND'; blindsOverride?: { sb: number; bb: number } }
  | { type: 'ACTION'; action: PlayerAction }
  | { type: 'AWARD'; winnersByPot: string[][] }
  | { type: 'ADD_CHIPS'; seat: number; amount: number }
  | { type: 'CASH_OUT'; seat: number }
  | { type: 'SIT_OUT'; seat: number }
  | { type: 'SIT_IN'; seat: number }
  | { type: 'END_GAME' }
  | { type: 'RESUME_PLAY' };

export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'NEW_GAME':
      return createGame(event.players, event.config);
    case 'START_HAND':
      return startHand(state, event.blindsOverride);
    case 'ACTION':
      return applyAction(state, event.action);
    case 'AWARD':
      return awardShowdown(state, event.winnersByPot);
    case 'ADD_CHIPS':
      return addChips(state, event.seat, event.amount);
    case 'CASH_OUT':
      return cashOut(state, event.seat);
    case 'SIT_OUT':
      return sitOut(state, event.seat);
    case 'SIT_IN':
      return sitIn(state, event.seat);
    case 'END_GAME':
      return endGame(state);
    case 'RESUME_PLAY':
      return resumePlay(state);
  }
}

// --- Persistence ---

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== STATE_VERSION) return null; // no migrations yet
    return parsed;
  } catch {
    return null;
  }
}

/** Total chips currently in the pot(s) for display during a hand. */
export function currentPot(state: GameState): number {
  return state.players.reduce((sum, p) => sum + p.committedThisHand, 0);
}

/** Whether another hand can be dealt. */
export function canStartHand(state: GameState): boolean {
  return state.players.filter(canPlay).length >= 2;
}

/** Players eligible to keep playing (for game-over detection). */
export function playersWithChips(state: GameState): Player[] {
  return state.players.filter((p) => p.status !== 'cashedOut' && p.stack > 0);
}
