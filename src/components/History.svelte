<script lang="ts">
  import type { GameState } from '../engine/types';
  import { chips } from '../lib/format';

  let { state, onClose }: { state: GameState; onClose: () => void } = $props();

  const hands = $derived([...state.history].reverse());
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="sheet">
    <header>
      <h2>Hand history</h2>
      <button class="close" onclick={onClose} aria-label="Close">✕</button>
    </header>

    {#if hands.length === 0}
      <p class="empty">No hands played yet.</p>
    {:else}
      <div class="list">
        {#each hands as h (h.handNo)}
          <div class="hand">
            <div class="hhead">
              <span class="hno">Hand {h.handNo}</span>
              <span class="hblinds">{h.blinds.sb}/{h.blinds.bb}</span>
            </div>
            <div class="winners">
              {#each h.results.filter((r) => r.won > 0) as r (r.id)}
                <span class="won">{r.name} won {chips(r.won)}</span>
              {/each}
            </div>
            {#if h.actions.length}
              <div class="actions">
                {#each h.actions as a, i (i)}
                  <span class="act">
                    {a.name}
                    {a.type}{a.amount > 0 ? ` ${chips(a.amount)}` : ''}
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
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
  .empty {
    color: var(--muted);
    text-align: center;
    padding: 24px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .hand {
    background: #10231a;
    border: 1px solid #23382c;
    border-radius: 12px;
    padding: 12px;
  }
  .hhead {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
  }
  .hblinds {
    color: var(--muted);
  }
  .winners {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .won {
    color: var(--ok);
    font-weight: 600;
    font-size: 14px;
  }
  .actions {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .act {
    font-size: 12px;
    color: var(--muted);
  }
</style>
