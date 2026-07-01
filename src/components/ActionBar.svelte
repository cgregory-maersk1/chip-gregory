<script lang="ts">
  import type { GameState } from '../engine/types';
  import { legalActions } from '../engine/betting';
  import { currentPot } from '../engine/engine';
  import { dispatch } from '../stores/game';
  import { chips } from '../lib/format';

  let { g }: { g: GameState } = $props();

  const la = $derived(legalActions(g));
  const player = $derived(g.players[la.actingSeat]);
  const pot = $derived(currentPot(g));

  let raiseTo = $state(0);
  let raising = $state(false);

  // Reset the raise entry whenever the turn/legal actions change.
  $effect(() => {
    void la.actingSeat;
    void la.minRaiseTo;
    raiseTo = la.minRaiseTo;
    raising = false;
  });

  function act(type: 'fold' | 'check' | 'call' | 'allin') {
    dispatch({ type: 'ACTION', action: { type } });
  }
  function confirmRaise() {
    const amount = Math.max(la.minRaiseTo, Math.min(raiseTo, la.maxTo));
    dispatch({ type: 'ACTION', action: { type: la.isOpen ? 'bet' : 'raise', amount } });
  }
  function preset(fraction: number) {
    const potAfterCall = pot + la.toCall;
    const target = player.committedThisStreet + la.toCall + Math.round(potAfterCall * fraction);
    raiseTo = Math.max(la.minRaiseTo, Math.min(target, la.maxTo));
  }

  const extra = $derived(raiseTo - player.committedThisStreet); // chips this raise costs
  const canFullRaise = $derived(la.maxTo >= la.minRaiseTo);
</script>

<div class="bar">
  <div class="turn">{player.name} to act · pot {chips(pot)}</div>

  {#if raising}
    <div class="raise">
      <div class="raise-head">
        <span>{la.isOpen ? 'Bet' : 'Raise'} to <strong>{chips(raiseTo)}</strong></span>
        <span class="cost">costs {chips(extra)}</span>
      </div>
      <input
        class="slider"
        type="range"
        min={la.minRaiseTo}
        max={la.maxTo}
        step="1"
        bind:value={raiseTo}
      />
      <div class="presets">
        <button onclick={() => (raiseTo = la.minRaiseTo)}>Min</button>
        <button onclick={() => preset(0.5)}>½ Pot</button>
        <button onclick={() => preset(1)}>Pot</button>
        <button onclick={() => (raiseTo = la.maxTo)}>Max</button>
      </div>
      <div class="raise-actions">
        <button class="ghost" onclick={() => (raising = false)}>Cancel</button>
        <button class="confirm" onclick={confirmRaise}>
          {la.isOpen ? 'Bet' : 'Raise to'} {chips(raiseTo)}
        </button>
      </div>
    </div>
  {:else}
    <div class="actions">
      <button class="fold" onclick={() => act('fold')}>Fold</button>
      {#if la.canCheck}
        <button class="call" onclick={() => act('check')}>Check</button>
      {:else if la.canCall}
        <button class="call" onclick={() => act('call')}>
          Call {chips(la.callAmount)}
        </button>
      {/if}
      {#if canFullRaise}
        <button class="raise-btn" onclick={() => (raising = true)}>
          {la.isOpen ? 'Bet' : 'Raise'}
        </button>
      {:else if la.canAggress}
        <button class="raise-btn" onclick={() => act('allin')}>All-in {chips(la.maxTo)}</button>
      {/if}
    </div>
    {#if canFullRaise && la.maxTo > 0}
      <button class="allin-link" onclick={() => act('allin')}>Go all-in ({chips(player.stack)})</button>
    {/if}
  {/if}
</div>

<style>
  .bar {
    background: #0c1a13;
    border-top: 1px solid #23382c;
    padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .turn {
    text-align: center;
    color: var(--muted);
    font-size: 14px;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }
  .actions button {
    padding: 18px 10px;
    font-size: 17px;
    font-weight: 700;
  }
  .fold {
    background: #3a1f1c;
    color: #ff9b8f;
  }
  .call {
    background: #1f3a4a;
    color: #bfe4ff;
  }
  .raise-btn {
    background: var(--felt);
    color: #fff;
  }
  .allin-link {
    background: transparent;
    color: var(--muted);
    padding: 6px;
    font-size: 13px;
    text-decoration: underline;
  }
  .raise {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .raise-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .raise-head strong {
    color: var(--gold);
    font-size: 20px;
  }
  .cost {
    color: var(--muted);
    font-size: 13px;
  }
  .slider {
    width: 100%;
    accent-color: var(--gold);
    height: 32px;
  }
  .presets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .presets button {
    padding: 10px 4px;
    background: #16281e;
    font-size: 14px;
  }
  .raise-actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 10px;
  }
  .raise-actions .confirm {
    background: var(--felt);
    font-weight: 700;
    font-size: 16px;
    padding: 16px;
  }
  .raise-actions .ghost {
    background: #23241f;
    color: var(--muted);
  }
</style>
