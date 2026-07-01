import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  game, canUndo, savedExists, newGame, dispatch, undo,
  hasSavedGame, resumeSavedGame, discardSavedGame, quitToMenu, rematch,
} from './game';
import { DEFAULT_CONFIG } from '../engine/engine';

function mockStorage(): void {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

const players = [{ name: 'Al' }, { name: 'Bea' }, { name: 'Cy' }];

describe('game store', () => {
  beforeEach(() => {
    mockStorage();
    discardSavedGame();
  });

  it('creates a game and autosaves it', () => {
    newGame(players, DEFAULT_CONFIG);
    expect(get(game)?.players).toHaveLength(3);
    expect(hasSavedGame()).toBe(true);
  });

  it('dispatches actions with undo tracking', () => {
    newGame(players, DEFAULT_CONFIG);
    dispatch({ type: 'START_HAND' });
    expect(get(game)?.phase).toBe('hand');
    expect(get(canUndo)).toBe(true);

    undo();
    expect(get(game)?.phase).toBe('setup');
    expect(get(canUndo)).toBe(false);
  });

  it('resumes a saved game from storage', () => {
    newGame(players, DEFAULT_CONFIG);
    dispatch({ type: 'START_HAND' });
    const snapshot = get(game);

    game.set(null); // simulate a fresh page load (storage still holds the game)
    expect(resumeSavedGame()).toBe(true);
    expect(get(game)).toEqual(snapshot);
  });

  it('discards the saved game', () => {
    newGame(players, DEFAULT_CONFIG);
    discardSavedGame();
    expect(get(game)).toBeNull();
    expect(hasSavedGame()).toBe(false);
  });

  it('quit mid-game keeps a resumable save; starting fresh clears it reactively', () => {
    newGame(players, DEFAULT_CONFIG);
    dispatch({ type: 'START_HAND' });

    quitToMenu();
    expect(get(game)).toBeNull();
    expect(get(savedExists)).toBe(true); // menu can offer Resume

    // The bug: with game already null, "start fresh" must still flip the flag.
    discardSavedGame();
    expect(get(savedExists)).toBe(false); // menu now shows the fresh setup
    expect(hasSavedGame()).toBe(false);
  });

  it('rematch keeps the same players with fresh stacks', () => {
    newGame(players, DEFAULT_CONFIG);
    dispatch({ type: 'START_HAND' });
    rematch();
    const g = get(game);
    expect(g?.phase).toBe('setup');
    expect(g?.players.map((p) => p.name)).toEqual(['Al', 'Bea', 'Cy']);
    expect(g?.players.every((p) => p.stack === DEFAULT_CONFIG.defaultBuyIn)).toBe(true);
  });
});
