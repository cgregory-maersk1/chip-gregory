<script lang="ts">
  import type { GameState } from '../engine/types';
  import { dispatch } from '../stores/game';
  import { chips, dollars } from '../lib/format';

  let { g }: { g: GameState } = $props();

  const pots = g.hand!.pots;
  // Pre-select the sole eligible player for any pot that has one.
  let selections = $state<string[][]>(
    pots.map((p) => (p.eligible.length === 1 ? [...p.eligible] : [])),
  );

  function nameOf(id: string): string {
    return g.players.find((p) => p.id === id)?.name ?? id;
  }
  function toggle(potIdx: number, id: string) {
    const cur = selections[potIdx];
    selections[potIdx] = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  }
  const allChosen = $derived(selections.every((s) => s.length > 0));

  function award() {
    if (!allChosen) return;
    dispatch({ type: 'AWARD', winnersByPot: selections.map((s) => [...s]) });
  }
</script>

<div class="showdown">
  <h2>Showdown — who won?</h2>
  {#each pots as pot, i (i)}
    <div class="pot">
      <div class="pot-head">
        <span class="pot-label">{pot.label}</span>
        <span class="pot-amt">{chips(pot.amount)} <small>({dollars(pot.amount, g.config.chipValue)})</small></span>
      </div>
      <div class="winners">
        {#each pot.eligible as id (id)}
          <button
            class="wbtn"
            class:sel={selections[i].includes(id)}
            onclick={() => toggle(i, id)}
          >
            {nameOf(id)}
          </button>
        {/each}
      </div>
      {#if selections[i].length > 1}
        <p class="split">Split {selections[i].length} ways</p>
      {/if}
    </div>
  {/each}

  <button class="award" onclick={award} disabled={!allChosen}>
    Award {pots.length > 1 ? 'pots' : 'pot'}
  </button>
  {#if !allChosen}
    <p class="hint">Tap the winner for each pot (tap two or more to split).</p>
  {/if}
</div>

<style>
  .showdown {
    background: #0c1a13;
    border-top: 1px solid #23382c;
    padding: 16px 14px calc(16px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 60vh;
    overflow-y: auto;
  }
  h2 {
    margin: 0;
    text-align: center;
    font-size: 18px;
  }
  .pot {
    background: #10231a;
    border: 1px solid #23382c;
    border-radius: 12px;
    padding: 12px;
  }
  .pot-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }
  .pot-label {
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    font-size: 13px;
    letter-spacing: 1px;
  }
  .pot-amt {
    font-size: 20px;
    font-weight: 800;
    color: var(--gold);
  }
  .pot-amt small {
    color: var(--muted);
    font-weight: 500;
    font-size: 12px;
  }
  .winners {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .wbtn {
    background: #16281e;
    border: 2px solid #2a4335;
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 600;
  }
  .wbtn.sel {
    background: #1c5a37;
    border-color: var(--ok);
    color: #fff;
  }
  .split {
    margin: 8px 0 0;
    color: var(--ok);
    font-size: 13px;
  }
  .award {
    background: var(--felt);
    font-size: 18px;
    font-weight: 700;
    padding: 16px;
  }
  .hint {
    text-align: center;
    color: var(--muted);
    font-size: 13px;
    margin: 0;
  }
</style>
