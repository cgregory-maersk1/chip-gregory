<script lang="ts">
  import type { GameState } from '../engine/types';
  import { dispatch } from '../stores/game';
  import { chips, dollars } from '../lib/format';

  let { g, onClose }: { g: GameState; onClose: () => void } = $props();

  let amounts = $state<Record<number, number>>(
    Object.fromEntries(g.players.map((p) => [p.seat, g.config.defaultBuyIn])),
  );
  let confirmingSeat = $state<number | null>(null);

  const inHand = $derived(g.phase === 'hand');
  const inShowdown = $derived(g.phase === 'showdown');

  function addChips(seat: number) {
    const amt = Number(amounts[seat]) || 0;
    if (amt > 0) dispatch({ type: 'ADD_CHIPS', seat, amount: amt });
  }
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="sheet">
    <header>
      <h2>Manage players</h2>
      <button class="close" onclick={onClose} aria-label="Close">✕</button>
    </header>
    {#if inShowdown}
      <p class="lock">Award the pot before changing players.</p>
    {:else if inHand}
      <p class="lock">Re-buys &amp; sit-ins apply between hands. Cashing a player out mid-hand folds them.</p>
    {/if}
    <div class="list">
      {#each g.players as p (p.id)}
        <div class="row" class:out={p.status === 'cashedOut'}>
          <div class="who">
            <div class="pname">{p.name}</div>
            <div class="pstack">
              {chips(p.stack)} chips · in {dollars(p.totalInvested, g.config.chipValue)}
              {#if p.status === 'cashedOut'}<span class="tag">cashed out</span>
              {:else if p.status === 'sittingOut'}<span class="tag">sitting out</span>{/if}
            </div>
          </div>
          {#if p.status !== 'cashedOut'}
            {#if confirmingSeat === p.seat}
              <div class="confirm">
                <div class="ctotal">
                  Cashing out with <strong>{chips(p.stack)}</strong> chips
                  = <span class="cdollars">{dollars(p.stack, g.config.chipValue)}</span>
                </div>
                <div class="cbtns">
                  <button class="ghost" onclick={() => (confirmingSeat = null)}>Cancel</button>
                  <button
                    class="cash"
                    onclick={() => {
                      dispatch({ type: 'CASH_OUT', seat: p.seat });
                      confirmingSeat = null;
                    }}
                  >
                    Confirm cash out
                  </button>
                </div>
              </div>
            {:else}
              <div class="controls">
                <div class="rebuy">
                  <input
                    type="number"
                    min="1"
                    step="10"
                    bind:value={amounts[p.seat]}
                    disabled={inHand || inShowdown}
                  />
                  <button class="add" onclick={() => addChips(p.seat)} disabled={inHand || inShowdown}>
                    Add
                  </button>
                </div>
                <div class="toggles">
                  {#if p.status === 'sittingOut'}
                    <button
                      onclick={() => dispatch({ type: 'SIT_IN', seat: p.seat })}
                      disabled={inHand || inShowdown}
                    >
                      Sit in
                    </button>
                  {:else}
                    <button
                      onclick={() => dispatch({ type: 'SIT_OUT', seat: p.seat })}
                      disabled={inShowdown}
                    >
                      Sit out
                    </button>
                  {/if}
                  <button class="cash" onclick={() => (confirmingSeat = p.seat)} disabled={inShowdown}>
                    Cash out
                  </button>
                </div>
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
    <p class="note">Re-buys and top-ups add to a player's stack and their total invested.</p>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: #000a;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
  }
  .sheet {
    background: #0d1c15;
    width: 100%;
    max-width: 560px;
    max-height: 88vh;
    overflow-y: auto;
    border-radius: 18px 18px 0 0;
    border: 1px solid #23382c;
    padding: 16px 14px calc(16px + env(safe-area-inset-bottom));
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  header h2 {
    margin: 0;
    font-size: 18px;
  }
  .close {
    background: #1c2b22;
    padding: 8px 12px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .row {
    background: #10231a;
    border: 1px solid #23382c;
    border-radius: 12px;
    padding: 12px;
  }
  .row.out {
    opacity: 0.5;
  }
  .pname {
    font-weight: 700;
    font-size: 16px;
  }
  .pstack {
    color: var(--muted);
    font-size: 13px;
    margin-top: 2px;
  }
  .tag {
    background: #2a2a2a;
    color: #ccc;
    padding: 1px 6px;
    border-radius: 6px;
    font-size: 11px;
    margin-left: 6px;
  }
  .controls {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  .rebuy {
    display: flex;
    gap: 6px;
  }
  .rebuy input {
    width: 90px;
  }
  .rebuy .add {
    background: var(--felt);
  }
  .toggles {
    display: flex;
    gap: 6px;
  }
  .toggles .cash {
    background: #3a1f1c;
    color: #ff9b8f;
  }
  .confirm {
    margin-top: 10px;
    background: #0c1c14;
    border: 1px solid #3a2a12;
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ctotal {
    text-align: center;
    font-size: 15px;
  }
  .ctotal strong {
    color: var(--gold);
    font-size: 20px;
  }
  .cdollars {
    color: var(--gold);
    font-weight: 700;
  }
  .cbtns {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 10px;
  }
  .cbtns .ghost {
    background: #23241f;
    color: var(--muted);
  }
  .cbtns .cash {
    background: #3a1f1c;
    color: #ff9b8f;
    font-weight: 700;
  }
  .note {
    color: var(--muted);
    font-size: 12px;
    text-align: center;
    margin: 14px 0 0;
  }
  .lock {
    background: #2a2412;
    border: 1px solid #5a4a1e;
    color: #ffd88a;
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 13px;
    text-align: center;
    margin: 0 0 12px;
  }
</style>
