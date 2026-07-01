// Core domain types for the Chip Gregory betting engine.
// The engine is pure: every operation takes a GameState and returns a new one.
// All chip amounts are integers (no fractional chips). Money is derived at the
// end via config.chipValue (dollars per chip).

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type PlayerStatus =
  | 'active' // in the hand, can still act
  | 'folded' // folded this hand
  | 'allIn' // in the hand but no chips left to act with
  | 'sittingOut' // dealt out of hands until they sit back in
  | 'cashedOut'; // left the table (final stack recorded)

export type Phase =
  | 'setup' // configuring players/blinds, no hand in progress
  | 'hand' // a hand is being played (betting)
  | 'showdown' // betting done, awaiting winner selection for each pot
  | 'handEnd' // hand awarded, ready to start the next
  | 'gameOver'; // session ended, show settlement

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface PlayerAction {
  type: ActionType;
  /** For bet/raise: the total amount to have committed this street (raise-to). */
  amount?: number;
}

export interface Player {
  id: string;
  name: string;
  seat: number; // fixed index; players[i].seat === i
  stack: number; // chips in front of the player
  totalInvested: number; // total chips bought in (buy-in + rebuys) — for settlement
  status: PlayerStatus;
  // per-hand scratch fields (reset by startHand)
  committedThisStreet: number;
  committedThisHand: number;
  hasActedThisStreet: boolean;
}

export interface EscalationConfig {
  enabled: boolean;
  mode: 'hands' | 'minutes';
  interval: number; // raise every N hands, or every N minutes
  factor: number; // multiply blinds by this each step (e.g. 2 = double)
}

export interface GameConfig {
  smallBlind: number;
  bigBlind: number;
  defaultBuyIn: number;
  chipValue: number; // dollars per chip (e.g. 0.05, or 1)
  escalation: EscalationConfig;
}

/** A (side) pot: chips plus the seat ids eligible to win them. */
export interface Pot {
  amount: number;
  eligible: string[]; // player ids who can win this pot
  label: string; // "Main pot", "Side pot 1", ...
}

export interface HandState {
  street: Street;
  currentBet: number; // highest committedThisStreet to match this street
  lastRaiseSize: number; // size of the last full bet/raise (drives min-raise)
  actingSeat: number; // seat whose turn it is (-1 when none)
  aggressorSeat: number | null; // last player to bet/raise this street
  sbSeat: number;
  bbSeat: number;
  pots: Pot[]; // populated at showdown
}

export interface LoggedAction {
  seat: number;
  name: string;
  type: ActionType;
  amount: number; // chips put in by this action (0 for check/fold)
  street: Street;
}

export interface HandSummary {
  handNo: number;
  blinds: { sb: number; bb: number };
  actions: LoggedAction[];
  pots: Pot[];
  results: { id: string; name: string; won: number }[]; // chips won per player
}

export interface GameState {
  version: number;
  config: GameConfig;
  players: Player[];
  dealerSeat: number;
  handNo: number; // number of hands started so far
  phase: Phase;
  hand: HandState | null;
  currentBlinds: { sb: number; bb: number };
  log: LoggedAction[]; // actions of the in-progress hand
  history: HandSummary[];
}

export const STATE_VERSION = 1;
