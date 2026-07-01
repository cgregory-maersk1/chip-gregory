<script lang="ts">
  import type { GameState } from '../engine/types';
  import { computeSettlement } from '../engine/settlement';
  import { chips, dollars, signedChips } from '../lib/format';

  let {
    state,
    onResume,
    onNewGame,
  }: { state: GameState; onResume: () => void; onNewGame: () => void } = $props();

  const s = $derived(computeSettlement(state.players, state.config.chipValue));
  const ranked = $derived([...s.nets].sort((a, b) => b.netChips - a.netChips));
</script>

<div class="settle">
  <header>
    <div class="chip">CG</div>
    <h1>Settle up</h1>
  </header>

  {#if !s.balanced}
    <p class="warn">Chip counts don't balance — check for a miscounted pot or rebuy.</p>
  {/if}

  <section>
    <h2>Results</h2>
    <div class="rows">
      {#each ranked as n (n.id)}
        <div class="rrow">
          <span class="rname">{n.name}</span>
          <span class="rchips">{chips(n.stack)} chips</span>
          <span class="rnet" class:up={n.netChips > 0} class:down={n.netChips < 0}>
            {signedChips(n.netChips)}
            <small>{dollars(n.netChips, state.config.chipValue)}</small>
          </span>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <h2>Payments</h2>
    {#if s.payments.length === 0}
      <p class="even">Everyone's even — no payments needed.</p>
    {:else}
      <div class="rows">
        {#each s.payments as p, i (i)}
          <div class="pay">
            <span class="from">{p.fromName}</span>
            <span class="arrow">→</span>
            <span class="to">{p.toName}</span>
            <span class="amt">{dollars(p.chips, state.config.chipValue)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="buttons">
    <button class="resume" onclick={onResume}>Keep playing</button>
    <button class="new" onclick={onNewGame}>New game</button>
  </div>
</div>

<style>
  .settle {
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
    padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .chip {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 800;
    color: var(--felt-dark);
    background: var(--gold);
    border: 4px dashed #fff6;
  }
  h1 {
    margin: 0;
  }
  h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--muted);
    margin: 0 0 10px;
  }
  section {
    background: #10231a;
    border: 1px solid #23382c;
    border-radius: 16px;
    padding: 16px;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rrow {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    align-items: baseline;
  }
  .rname {
    font-weight: 700;
  }
  .rchips {
    color: var(--muted);
    font-size: 13px;
  }
  .rnet {
    font-weight: 800;
    text-align: right;
    min-width: 90px;
  }
  .rnet small {
    display: block;
    font-weight: 500;
    font-size: 12px;
    color: var(--muted);
  }
  .rnet.up {
    color: var(--ok);
  }
  .rnet.down {
    color: #ff8a7a;
  }
  .pay {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto;
    gap: 8px;
    align-items: center;
    background: #0c1c14;
    border-radius: 10px;
    padding: 10px 12px;
  }
  .pay .to {
    text-align: right;
    font-weight: 700;
  }
  .pay .from {
    font-weight: 700;
  }
  .arrow {
    color: var(--muted);
  }
  .pay .amt {
    color: var(--gold);
    font-weight: 800;
  }
  .even {
    color: var(--muted);
    text-align: center;
    margin: 0;
  }
  .warn {
    background: #3a2a12;
    border: 1px solid #6b5320;
    color: #ffd88a;
    padding: 10px;
    border-radius: 10px;
    text-align: center;
    font-size: 14px;
    margin: 0;
  }
  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .buttons button {
    padding: 16px;
    font-weight: 700;
    font-size: 16px;
  }
  .resume {
    background: #16281e;
  }
  .new {
    background: var(--felt);
  }
</style>
