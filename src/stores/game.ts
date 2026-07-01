import { writable, get } from 'svelte/store';
import type { GameState } from '../engine/types';
import { createGame, reduce, serialize, deserialize, healHand, type GameEvent, type SetupPlayer } from '../engine/engine';
import { blindsForMinutes } from '../engine/blinds';
import type { GameConfig } from '../engine/types';

const SAVE_KEY = 'chip-gregory:v1';
const ROSTER_KEY = 'chip-gregory:last';
const UNDO_LIMIT = 100;

export interface LastRoster {
  names: string[];
  buyIns: number[];
  config: GameConfig;
}

function saveRoster(players: SetupPlayer[], config: GameConfig): void {
  try {
    localStorage.setItem(
      ROSTER_KEY,
      JSON.stringify({
        names: players.map((p) => p.name),
        buyIns: players.map((p) => p.buyIn ?? config.defaultBuyIn),
        config,
      }),
    );
  } catch {
    /* ignore */
  }
}

/** The roster from the most recent game, for "play again with the same players". */
export function getLastRoster(): LastRoster | null {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as LastRoster;
    return r?.names?.length ? r : null;
  } catch {
    return null;
  }
}

/** The current game (null until a game is created or resumed). */
export const game = writable<GameState | null>(null);
/** Whether an undo step is available. */
export const canUndo = writable(false);

let undoStack: string[] = [];
let startedAt = 0; // epoch ms — drives minutes-mode blind escalation

function persist(): void {
  try {
    const state = get(game);
    if (state) {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ state, startedAt }));
    } else {
      localStorage.removeItem(SAVE_KEY);
    }
  } catch {
    /* storage may be unavailable (private mode) — degrade gracefully */
  }
}

function commit(next: GameState, recordUndo: boolean): void {
  if (recordUndo) {
    const prev = get(game);
    if (prev) {
      undoStack.push(serialize(prev));
      if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    }
  }
  game.set(next);
  canUndo.set(undoStack.length > 0);
  persist();
}

/** Start a brand-new game (clears history + undo). */
export function newGame(players: SetupPlayer[], config: GameConfig): void {
  undoStack = [];
  startedAt = Date.now();
  saveRoster(players, config);
  commit(createGame(players, config), false);
}

/**
 * Apply a game event with undo tracking + autosave. For START_HAND under
 * minutes-mode escalation, injects the time-based blind level.
 */
export function dispatch(event: GameEvent): void {
  const state = get(game);
  if (!state) return;

  let ev = event;
  if (ev.type === 'START_HAND' && !ev.blindsOverride) {
    const esc = state.config.escalation;
    if (esc.enabled && esc.mode === 'minutes') {
      const elapsedMin = (Date.now() - startedAt) / 60000;
      ev = { ...ev, blindsOverride: blindsForMinutes(state.config, elapsedMin) };
    }
  }
  commit(reduce(state, ev), true);
}

/** Step back one action. */
export function undo(): void {
  const prev = undoStack.pop();
  if (!prev) return;
  const state = deserialize(prev);
  if (state) {
    game.set(state);
    canUndo.set(undoStack.length > 0);
    persist();
  }
}

/** Is there a saved game on disk? */
export function hasSavedGame(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) != null;
  } catch {
    return false;
  }
}

/** Load the saved game into the store. Returns true on success. */
export function resumeSavedGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state: unknown; startedAt?: number };
    const state = deserialize(JSON.stringify(parsed.state));
    if (!state) return false;
    startedAt = parsed.startedAt ?? Date.now();
    undoStack = [];
    game.set(healHand(state)); // repair a stuck hand from an older build
    canUndo.set(false);
    persist();
    return true;
  } catch {
    return false;
  }
}

/** Forget the saved game and reset the store. */
export function discardSavedGame(): void {
  undoStack = [];
  game.set(null);
  canUndo.set(false);
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
