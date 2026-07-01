<script lang="ts">
  import {
    game, savedExists, dispatch, resumeSavedGame, discardSavedGame, rematch,
  } from './stores/game';
  import Setup from './components/Setup.svelte';
  import Table from './components/Table.svelte';
  import Settlement from './components/Settlement.svelte';

  // Offer to resume whenever we're at the menu (no active game) but a save
  // exists. Both dependencies are reactive stores so this updates reliably.
  const showResume = $derived($game === null && $savedExists);

  function resume() {
    resumeSavedGame();
  }
  function startFresh() {
    discardSavedGame();
  }
</script>

{#if $game && $game.phase === 'gameOver'}
  <Settlement
    state={$game}
    onResume={() => dispatch({ type: 'RESUME_PLAY' })}
    onRematch={() => rematch()}
    onNewGame={() => discardSavedGame()}
  />
{:else if $game}
  <Table g={$game} />
{:else}
  <Setup />
{/if}

{#if showResume}
  <div class="resume-overlay" role="dialog" aria-modal="true">
    <div class="card">
      <div class="chip">CG</div>
      <h2>Welcome back</h2>
      <p>You have a game in progress. Pick up where you left off?</p>
      <button class="resume" onclick={resume}>Resume game</button>
      <button class="fresh" onclick={startFresh}>Start a new game</button>
    </div>
  </div>
{/if}

<style>
  .resume-overlay {
    position: fixed;
    inset: 0;
    background: #000c;
    display: grid;
    place-items: center;
    padding: 24px;
    z-index: 80;
  }
  .card {
    background: #0d1c15;
    border: 1px solid #23382c;
    border-radius: 18px;
    padding: 28px 22px;
    max-width: 360px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
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
  h2 {
    margin: 4px 0 0;
  }
  p {
    margin: 0;
    color: var(--muted);
  }
  .card button {
    width: 100%;
    padding: 14px;
    font-weight: 700;
  }
  .resume {
    background: var(--felt);
  }
  .fresh {
    background: #16281e;
    color: var(--muted);
  }
</style>
