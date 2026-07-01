<script lang="ts">
  import type { GameState, Street } from '../engine/types';
  import { currentPot, canStartHand } from '../engine/engine';
  import { dispatch, undo, canUndo, quitToMenu, rematch } from '../stores/game';
  import { chips, dollars } from '../lib/format';
  import Seat from './Seat.svelte';
  import Board from './Board.svelte';
  import ActionBar from './ActionBar.svelte';
  import Showdown from './Showdown.svelte';
  import Manage from './Manage.svelte';
  import History from './History.svelte';

  let { g }: { g: GameState } = $props();

  let showManage = $state(false);
  let showHistory = $state(false);
  let confirmQuit = $state(false);

  const n = $derived(g.players.length);
  const pot = $derived(currentPot(g));
  const canDeal = $derived(canStartHand(g));

  // Community cards shown: 0 pre-flop, 3 flop, 4 turn, 5 river/showdown.
  const boardCount = $derived.by(() => {
    switch (g.hand?.street) {
      case 'flop': return 3;
      case 'turn': return 4;
      case 'river':
      case 'showdown': return 5;
      default: return 0;
    }
  });

  const streetLabel: Record<Street, string> = {
    preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown',
  };

  // Winners of the just-finished hand (for the handEnd highlight + banner).
  const lastWinners = $derived.by(() => {
    if (g.phase !== 'handEnd' || g.history.length === 0) return new Set<string>();
    const last = g.history[g.history.length - 1];
    return new Set(last.results.filter((r) => r.won > 0).map((r) => r.id));
  });

  function seatStyle(i: number): string {
    const angle = Math.PI / 2 + (i / n) * 2 * Math.PI; // seat 0 at bottom
    const left = 50 + 43 * Math.cos(angle);
    const top = 50 + 39 * Math.sin(angle);
    return `left:${left}%; top:${top}%;`;
  }

  function blindFor(seat: number): 'SB' | 'BB' | null {
    if (!g.hand) return null;
    if (g.hand.sbSeat === seat) return 'SB';
    if (g.hand.bbSeat === seat) return 'BB';
    return null;
  }

  // Keep the screen awake while a hand is live.
  $effect(() => {
    const live = g.phase === 'hand' || g.phase === 'showdown';
    let sentinel: { release: () => void } | null = null;
    let released = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => void }> } };
    if (live && nav.wakeLock) {
      nav.wakeLock.request('screen').then((s) => {
        if (released) s.release();
        else sentinel = s;
      }).catch(() => {});
    }
    return () => {
      released = true;
      try { sentinel?.release(); } catch { /* ignore */ }
    };
  });
</script>

<div class="wrap">
  <div class="topbar">
    <div class="blinds">
      <span class="lbl">Blinds</span> {g.currentBlinds.sb}/{g.currentBlinds.bb}
      <span class="hand-no">· Hand {g.handNo}</span>
    </div>
    <div class="tools">
      <button onclick={undo} disabled={!$canUndo} aria-label="Undo">↩</button>
      <button onclick={() => (showHistory = true)} aria-label="History">☰</button>
      <button onclick={() => (showManage = true)}>Players</button>
      <button class="quit-btn" onclick={() => (confirmQuit = true)}>Quit</button>
    </div>
  </div>

  <div class="felt">
    <div class="center">
      <Board count={boardCount} />
      <div class="pot">
        {#if pot > 0}
          <div class="pot-amt">{chips(pot)}</div>
          <div class="pot-sub">pot · {dollars(pot, g.config.chipValue)}</div>
        {/if}
        {#if g.hand}
          <div class="street">{streetLabel[g.hand.street]}</div>
        {/if}
      </div>
    </div>

    {#each g.players as p, i (p.id)}
      <div class="seat-pos" style={seatStyle(i)}>
        <Seat
          player={p}
          acting={g.phase === 'hand' && g.hand?.actingSeat === i}
          dealer={g.dealerSeat === i}
          blind={blindFor(i)}
          winner={lastWinners.has(p.id)}
        />
      </div>
    {/each}
  </div>

  <div class="controls">
    {#if g.phase === 'hand'}
      <ActionBar {g} />
    {:else if g.phase === 'showdown'}
      <Showdown {g} />
    {:else}
      <div class="between">
        {#if g.phase === 'handEnd' && lastWinners.size > 0}
          <div class="banner">
            {#each g.history[g.history.length - 1].results.filter((r) => r.won > 0) as r (r.id)}
              <span>{r.name} won {chips(r.won)}</span>
            {/each}
          </div>
        {/if}
        {#if canDeal}
          <button class="deal" onclick={() => dispatch({ type: 'START_HAND' })}>
            Deal {g.handNo === 0 ? 'first' : 'next'} hand
          </button>
        {:else}
          <p class="need">
            Game over — one player has all the chips. Re-buy under Players to keep this game going,
            or start a rematch.
          </p>
          <button class="deal" onclick={rematch}>Rematch — same players, fresh buy-ins</button>
        {/if}
        <button class="settle" onclick={() => dispatch({ type: 'END_GAME' })}>End game &amp; settle up</button>
      </div>
    {/if}
  </div>
</div>

{#if showManage}
  <Manage {g} onClose={() => (showManage = false)} />
{/if}
{#if showHistory}
  <History state={g} onClose={() => (showHistory = false)} />
{/if}
{#if confirmQuit}
  <div class="quit-overlay" role="dialog" aria-modal="true">
    <div class="quit-card">
      <h3>Leave this game?</h3>
      <p>Your game is saved — you can resume it from the menu.</p>
      <div class="quit-btns">
        <button class="keep" onclick={() => (confirmQuit = false)}>Keep playing</button>
        <button class="leave" onclick={quitToMenu}>Quit to menu</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px calc(10px + env(safe-area-inset-top));
    padding-top: max(10px, env(safe-area-inset-top));
    background: #0a1710;
    border-bottom: 1px solid #1c2b22;
  }
  .blinds {
    font-weight: 700;
  }
  .blinds .lbl {
    color: var(--muted);
    font-weight: 500;
    font-size: 13px;
  }
  .hand-no {
    color: var(--muted);
    font-weight: 500;
    font-size: 13px;
  }
  .tools {
    display: flex;
    gap: 6px;
  }
  .tools button {
    padding: 8px 12px;
    background: #16281e;
  }
  .tools .quit-btn {
    background: #2a1a17;
    color: #ffb3a7;
  }
  .quit-overlay {
    position: fixed;
    inset: 0;
    background: #000c;
    display: grid;
    place-items: center;
    padding: 24px;
    z-index: 80;
  }
  .quit-card {
    background: #0d1c15;
    border: 1px solid #23382c;
    border-radius: 18px;
    padding: 24px 22px;
    max-width: 360px;
    width: 100%;
    text-align: center;
  }
  .quit-card h3 {
    margin: 0 0 8px;
    font-size: 20px;
  }
  .quit-card p {
    margin: 0 0 18px;
    color: var(--muted);
  }
  .quit-btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .quit-btns button {
    padding: 14px;
    font-weight: 700;
  }
  .quit-btns .keep {
    background: var(--felt);
  }
  .quit-btns .leave {
    background: #3a1f1c;
    color: #ff9b8f;
  }
  .felt {
    position: relative;
    flex: 1;
    min-height: 340px;
    margin: 18px 14px;
    border-radius: 48% / 46%;
    background: radial-gradient(circle at 50% 42%, #0e7d44, var(--felt) 55%, #084e2a);
    border: 10px solid var(--felt-rail);
    box-shadow: inset 0 0 60px #00000055, 0 10px 30px #0006;
  }
  .center {
    position: absolute;
    top: 42%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: max-content;
  }
  .pot {
    text-align: center;
  }
  .pot-amt {
    font-size: 26px;
    font-weight: 800;
    color: #fff;
    text-shadow: 0 2px 6px #0008;
  }
  .pot-sub {
    color: #d9f0e2;
    font-size: 12px;
  }
  .street {
    margin-top: 4px;
    color: #cfe9d8;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .seat-pos {
    position: absolute;
    transform: translate(-50%, -50%);
  }
  .controls {
    margin-top: auto;
  }
  .between {
    padding: 14px 14px calc(14px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .banner {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    justify-content: center;
    color: var(--ok);
    font-weight: 700;
  }
  .deal {
    background: var(--felt);
    font-size: 18px;
    font-weight: 700;
    padding: 18px;
    border: 1px solid #1f8a52;
  }
  .settle {
    background: #16281e;
    color: var(--muted);
  }
  .need {
    text-align: center;
    color: #e6b800;
    margin: 0;
  }
</style>
