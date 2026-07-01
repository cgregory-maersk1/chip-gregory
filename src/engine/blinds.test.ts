import { describe, it, expect } from 'vitest';
import { blindsForHand, blindsForMinutes } from './blinds';
import { DEFAULT_CONFIG } from './engine';
import type { GameConfig } from './types';

const base: GameConfig = { ...DEFAULT_CONFIG, smallBlind: 1, bigBlind: 2 };

describe('blindsForHand', () => {
  it('returns base blinds when escalation is off', () => {
    expect(blindsForHand(base, 1)).toEqual({ sb: 1, bb: 2 });
    expect(blindsForHand(base, 99)).toEqual({ sb: 1, bb: 2 });
  });

  it('doubles blinds every N hands when escalating', () => {
    const cfg: GameConfig = {
      ...base,
      escalation: { enabled: true, mode: 'hands', interval: 5, factor: 2 },
    };
    expect(blindsForHand(cfg, 1)).toEqual({ sb: 1, bb: 2 }); // level 0
    expect(blindsForHand(cfg, 5)).toEqual({ sb: 1, bb: 2 }); // still level 0
    expect(blindsForHand(cfg, 6)).toEqual({ sb: 2, bb: 4 }); // level 1
    expect(blindsForHand(cfg, 11)).toEqual({ sb: 4, bb: 8 }); // level 2
  });

  it('ignores hands schedule in minutes mode', () => {
    const cfg: GameConfig = {
      ...base,
      escalation: { enabled: true, mode: 'minutes', interval: 15, factor: 2 },
    };
    expect(blindsForHand(cfg, 20)).toEqual({ sb: 1, bb: 2 });
  });
});

describe('blindsForMinutes', () => {
  it('raises blinds by elapsed time', () => {
    const cfg: GameConfig = {
      ...base,
      escalation: { enabled: true, mode: 'minutes', interval: 15, factor: 2 },
    };
    expect(blindsForMinutes(cfg, 0)).toEqual({ sb: 1, bb: 2 });
    expect(blindsForMinutes(cfg, 14)).toEqual({ sb: 1, bb: 2 });
    expect(blindsForMinutes(cfg, 15)).toEqual({ sb: 2, bb: 4 });
    expect(blindsForMinutes(cfg, 31)).toEqual({ sb: 4, bb: 8 });
  });
});
