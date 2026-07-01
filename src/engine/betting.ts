import type { GameState, HandSummary, Player, PlayerAction, Street } from './types';
import { buildPots } from './sidepots';
import { clone, isContender, dealtIn, nextSeat } from './util';

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];

export interface LegalActions {
  actingSeat: number;
  toCall: number; // chips needed to match the current bet
  callAmount: number; // actual chips a call costs (capped at stack -> all-in call)
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  /** True when the player can put in more than the current bet (bet or raise). */
  canAggress: boolean;
  isOpen: boolean; // no bet yet this street -> the aggressive action is a "bet"
  minRaiseTo: number; // minimum legal raise-to (absolute committed-this-street)
  maxTo: number; // all-in raise-to (absolute committed-this-street)
  bb: number;
}

/** What the player on turn is allowed to do. */
export function legalActions(state: GameState): LegalActions {
  const h = state.hand;
  if (!h || h.actingSeat < 0) {
    return {
      actingSeat: -1, toCall: 0, callAmount: 0, canFold: false, canCheck: false,
      canCall: false, canAggress: false, isOpen: true, minRaiseTo: 0, maxTo: 0,
      bb: state.currentBlinds.bb,
    };
  }
  const p = state.players[h.actingSeat];
  const toCall = Math.max(0, h.currentBet - p.committedThisStreet);
  const maxTo = p.committedThisStreet + p.stack;
  const minIncrement = h.lastRaiseSize; // for the first bet this equals the big blind
  const minRaiseTo = Math.min(h.currentBet + minIncrement, maxTo);
  return {
    actingSeat: h.actingSeat,
    toCall,
    callAmount: Math.min(toCall, p.stack),
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0 && p.stack > 0,
    canAggress: maxTo > h.currentBet, // has chips beyond the call
    isOpen: h.currentBet === 0,
    minRaiseTo,
    maxTo,
    bb: state.currentBlinds.bb,
  };
}

function commit(p: Player, amount: number): void {
  const amt = Math.min(amount, p.stack);
  p.stack -= amt;
  p.committedThisStreet += amt;
  p.committedThisHand += amt;
  if (p.stack === 0) p.status = 'allIn';
}

/** Apply the acting player's action and advance turn / street / phase. Pure. */
export function applyAction(state: GameState, action: PlayerAction): GameState {
  const s = clone(state);
  const h = s.hand;
  if (!h || h.actingSeat < 0) throw new Error('No hand in progress');
  const p = s.players[h.actingSeat];
  if (p.status !== 'active') throw new Error('Acting player is not active');

  const toCall = Math.max(0, h.currentBet - p.committedThisStreet);
  let putIn = 0;

  switch (action.type) {
    case 'fold':
      p.status = 'folded';
      p.hasActedThisStreet = true;
      break;

    case 'check':
      if (toCall !== 0) throw new Error('Cannot check facing a bet');
      p.hasActedThisStreet = true;
      break;

    case 'call': {
      if (toCall === 0) throw new Error('Nothing to call — use check');
      putIn = Math.min(toCall, p.stack);
      commit(p, putIn);
      p.hasActedThisStreet = true;
      break;
    }

    case 'bet':
    case 'raise': {
      const target = action.amount ?? 0;
      const maxTo = p.committedThisStreet + p.stack;
      if (target <= h.currentBet) throw new Error('Raise must exceed the current bet');
      if (target > maxTo) throw new Error('Raise exceeds stack');
      putIn = target - p.committedThisStreet;
      applyAggression(s, p, target);
      commit(p, putIn);
      break;
    }

    case 'allin': {
      if (p.stack === 0) throw new Error('No chips to go all-in');
      const target = p.committedThisStreet + p.stack;
      putIn = p.stack;
      if (target > h.currentBet) {
        applyAggression(s, p, target);
      } else {
        // all-in for less than the current bet: a call, does not reopen action
        p.hasActedThisStreet = true;
      }
      commit(p, putIn);
      break;
    }
  }

  s.log.push({ seat: p.seat, name: p.name, type: action.type, amount: putIn, street: h.street });

  // Everyone but one folded -> that player wins immediately.
  const contenders = s.players.filter(isContender);
  if (contenders.length === 1) {
    return finalizeFoldWin(s, contenders[0]);
  }

  // Find the next player who still needs to act this street.
  const next = nextSeat(s.players, h.actingSeat, (q) => needsToAct(q, h.currentBet));
  if (next !== -1) {
    h.actingSeat = next;
    return s;
  }

  // Betting round is complete.
  return closeStreet(s);
}

function needsToAct(q: Player, currentBet: number): boolean {
  return q.status === 'active' && (!q.hasActedThisStreet || q.committedThisStreet < currentBet);
}

/**
 * After a hand is dealt (blinds posted), resolve the rare case where no one can
 * act — e.g. heads-up where both players are all-in from posting blinds. Ensures
 * `actingSeat` points at a real actor, or transitions straight to showdown.
 */
export function resolveStart(state: GameState): GameState {
  const s = clone(state);
  const h = s.hand!;
  const contenders = s.players.filter(isContender);
  if (contenders.length === 1) return finalizeFoldWin(s, contenders[0]);

  if (!s.players.some((q) => needsToAct(q, h.currentBet))) {
    return closeStreet(s);
  }
  if (!needsToAct(s.players[h.actingSeat], h.currentBet)) {
    const n = nextSeat(s.players, h.actingSeat, (q) => needsToAct(q, h.currentBet));
    if (n === -1) return closeStreet(s);
    h.actingSeat = n;
  }
  return s;
}

/** Register a bet/raise: set the new high, min-raise size, aggressor, reopen action. */
function applyAggression(s: GameState, p: Player, target: number): void {
  const h = s.hand!;
  const increment = target - h.currentBet;
  if (increment >= h.lastRaiseSize) h.lastRaiseSize = increment; // full raise resets min-raise
  h.currentBet = target;
  h.aggressorSeat = p.seat;
  for (const q of s.players) {
    if (q.seat !== p.seat && q.status === 'active') q.hasActedThisStreet = false;
  }
  p.hasActedThisStreet = true;
}

/** Return an uncalled bet (top contributor this street exceeding everyone else). */
function returnUncalled(s: GameState): void {
  const byCommit = s.players
    .filter(dealtIn)
    .slice()
    .sort((a, b) => b.committedThisStreet - a.committedThisStreet);
  if (byCommit.length < 1) return;
  const top = byCommit[0];
  const second = byCommit[1]?.committedThisStreet ?? 0;
  const excess = top.committedThisStreet - second;
  if (excess > 0) {
    top.stack += excess;
    top.committedThisStreet -= excess;
    top.committedThisHand -= excess;
    if (top.status === 'allIn' && top.stack > 0) top.status = 'active';
  }
}

/** Close the current betting round: return uncalled chips, then advance or resolve. */
function closeStreet(s: GameState): GameState {
  const h = s.hand!;
  returnUncalled(s);

  const contenders = s.players.filter(isContender);
  if (contenders.length === 1) return finalizeFoldWin(s, contenders[0]);

  const stillActive = s.players.filter((q) => q.status === 'active');
  const atRiver = h.street === 'river';

  if (atRiver || stillActive.length <= 1) {
    return goToShowdown(s);
  }
  return advanceStreet(s);
}

function advanceStreet(s: GameState): GameState {
  const h = s.hand!;
  const idx = STREET_ORDER.indexOf(h.street);
  h.street = STREET_ORDER[idx + 1];
  h.currentBet = 0;
  h.lastRaiseSize = s.currentBlinds.bb; // minimum opening bet on the new street
  h.aggressorSeat = null;
  for (const q of s.players) {
    q.committedThisStreet = 0;
    if (q.status === 'active') q.hasActedThisStreet = false;
  }
  // First to act postflop = first active seat left of the button.
  h.actingSeat = nextSeat(s.players, s.dealerSeat, (q) => q.status === 'active');
  return s;
}

function goToShowdown(s: GameState): GameState {
  const h = s.hand!;
  h.pots = buildPots(s.players);
  h.street = 'showdown';
  h.actingSeat = -1;
  s.phase = 'showdown';
  return s;
}

/** Everyone folded to one player: award the whole pot and end the hand. */
function finalizeFoldWin(s: GameState, winner: Player): GameState {
  returnUncalled(s);
  const pot = s.players.reduce((sum, q) => sum + q.committedThisHand, 0);
  const wonById: Record<string, number> = { [winner.id]: pot };
  s.hand!.pots = [{ amount: pot, eligible: [winner.id], label: 'Main pot' }];
  return finalizeHand(s, wonById);
}

/**
 * Credit each winner's stack, record the hand summary, clear the hand, and move
 * to 'handEnd'. Shared by fold-wins and showdown awards.
 */
export function finalizeHand(
  state: GameState,
  wonById: Record<string, number>,
): GameState {
  const s = state; // callers pass an already-cloned state; finalize mutates it
  const h = s.hand!;
  for (const p of s.players) {
    const won = wonById[p.id] ?? 0;
    if (won) p.stack += won;
  }
  const results = s.players
    .filter(dealtIn)
    .map((p) => ({ id: p.id, name: p.name, won: wonById[p.id] ?? 0 }));
  const summary: HandSummary = {
    handNo: s.handNo,
    blinds: { ...s.currentBlinds },
    actions: [...s.log],
    pots: h.pots,
    results,
  };
  s.history.push(summary);
  s.log = [];
  s.hand = null;
  s.phase = 'handEnd';
  return s;
}
