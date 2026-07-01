<script lang="ts">
  import { newGame, getLastRoster } from '../stores/game';
  import type { GameConfig } from '../engine/types';

  let names = $state<string[]>(['', '', '']);
  let smallBlind = $state(1);
  let bigBlind = $state(2);
  let buyIn = $state(200);
  let chipValue = $state(1);
  let escalate = $state(false);
  let escMode = $state<'hands' | 'minutes'>('minutes');
  let escInterval = $state(15);
  let escFactor = $state(2);

  // Offer to reuse the previous game's players.
  const last = getLastRoster();
  let showLast = $state(last !== null);

  function useLastPlayers() {
    if (!last) return;
    names = [...last.names];
    smallBlind = last.config.smallBlind;
    bigBlind = last.config.bigBlind;
    buyIn = last.config.defaultBuyIn;
    chipValue = last.config.chipValue;
    escalate = last.config.escalation.enabled;
    escMode = last.config.escalation.mode;
    escInterval = last.config.escalation.interval;
    escFactor = last.config.escalation.factor;
    showLast = false;
  }

  function addPlayer() {
    if (names.length < 10) names = [...names, ''];
  }
  function removePlayer(i: number) {
    if (names.length > 2) names = names.filter((_, j) => j !== i);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= names.length) return;
    const copy = [...names];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    names = copy;
  }

  const valid = $derived(
    names.length >= 2 &&
      smallBlind >= 1 &&
      bigBlind >= smallBlind &&
      buyIn >= bigBlind &&
      chipValue > 0,
  );

  function start() {
    if (!valid) return;
    const players = names.map((n, i) => ({ name: n.trim() || `Player ${i + 1}`, buyIn }));
    const config: GameConfig = {
      smallBlind,
      bigBlind,
      defaultBuyIn: buyIn,
      chipValue,
      escalation: { enabled: escalate, mode: escMode, interval: escInterval, factor: escFactor },
    };
    newGame(players, config);
  }
</script>

<div class="setup">
  <header>
    <div class="chip">CG</div>
    <h1>Chip Gregory</h1>
    <p>Set up your table</p>
  </header>

  {#if showLast && last}
    <div class="last-roster">
      <div class="lr-text">
        <strong>Play again?</strong>
        <span>{last.names.join(', ')}</span>
      </div>
      <div class="lr-actions">
        <button class="lr-use" onclick={useLastPlayers}>Use same players</button>
        <button class="lr-dismiss" onclick={() => (showLast = false)}>Start fresh</button>
      </div>
    </div>
  {/if}

  <section>
    <h2>Players ({names.length})</h2>
    <div class="players">
      {#each names.map((_, i) => i) as i (i)}
        <div class="player-row">
          <span class="num">{i + 1}</span>
          <input
            type="text"
            placeholder={`Player ${i + 1}`}
            bind:value={names[i]}
            maxlength="16"
          />
          <button class="mini" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
          <button class="mini" onclick={() => move(i, 1)} disabled={i === names.length - 1} aria-label="Move down">▼</button>
          <button class="mini danger" onclick={() => removePlayer(i)} disabled={names.length <= 2} aria-label="Remove">✕</button>
        </div>
      {/each}
    </div>
    <button class="add" onclick={addPlayer} disabled={names.length >= 10}>+ Add player</button>
  </section>

  <section class="grid">
    <label>
      Small blind
      <input type="number" min="1" bind:value={smallBlind} />
    </label>
    <label>
      Big blind (min bet)
      <input type="number" min={smallBlind} bind:value={bigBlind} />
    </label>
    <label>
      Buy-in (chips)
      <input type="number" min={bigBlind} step="10" bind:value={buyIn} />
    </label>
    <label>
      Chip value ($ each)
      <input type="number" min="0.01" step="0.01" bind:value={chipValue} />
    </label>
  </section>

  <section class="esc">
    <label class="toggle">
      <input type="checkbox" bind:checked={escalate} />
      <span>Increase blinds through the game</span>
    </label>
    {#if escalate}
      <div class="grid">
        <label>
          Every
          <div class="inline">
            <input type="number" min="1" bind:value={escInterval} />
            <select bind:value={escMode}>
              <option value="minutes">minutes</option>
              <option value="hands">hands</option>
            </select>
          </div>
        </label>
        <label>
          Multiply blinds by
          <input type="number" min="1" step="0.5" bind:value={escFactor} />
        </label>
      </div>
      <p class="hint">
        e.g. every {escInterval} {escMode}, blinds go {smallBlind}/{bigBlind} →
        {Math.round(smallBlind * escFactor)}/{Math.round(bigBlind * escFactor)} → …
      </p>
    {/if}
  </section>

  <button class="start" onclick={start} disabled={!valid}>Start game</button>
  {#if !valid}
    <p class="hint warn">Need 2+ players, blinds ≥ 1, big blind ≥ small blind, and buy-in ≥ big blind.</p>
  {/if}
</div>

<style>
  .setup {
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
    padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .chip {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 800;
    color: var(--felt-dark);
    background: var(--gold);
    border: 4px dashed #fff6;
  }
  header h1 {
    margin: 4px 0 0;
  }
  header p {
    margin: 0;
    color: var(--muted);
  }
  h2 {
    font-size: 15px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--muted);
    margin: 0 0 10px;
  }
  .last-roster {
    background: #13301f;
    border: 1px solid #2f7a4d;
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .lr-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .lr-text strong {
    font-size: 16px;
  }
  .lr-text span {
    color: var(--muted);
    font-size: 14px;
  }
  .lr-actions {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 10px;
  }
  .lr-use {
    background: var(--felt);
    font-weight: 700;
  }
  .lr-dismiss {
    background: #16281e;
    color: var(--muted);
  }
  section {
    background: #10231a;
    border: 1px solid #21382c;
    border-radius: 16px;
    padding: 16px;
  }
  .players {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .player-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .player-row .num {
    width: 20px;
    color: var(--muted);
    text-align: center;
  }
  .player-row input {
    flex: 1;
    min-width: 0;
  }
  .mini {
    padding: 8px 10px;
    background: #1c2b22;
  }
  .mini.danger {
    background: #3a1f1c;
    color: #ff9b8f;
  }
  .add {
    margin-top: 12px;
    width: 100%;
    background: #16281e;
    border: 1px dashed #2f4a3a;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 14px;
    color: var(--muted);
  }
  label input,
  label select {
    width: 100%;
  }
  .inline {
    display: flex;
    gap: 6px;
  }
  .inline input {
    width: 70px;
  }
  .toggle {
    flex-direction: row;
    align-items: center;
    gap: 10px;
    color: var(--text);
    font-size: 16px;
  }
  .toggle input {
    width: 22px;
    height: 22px;
  }
  .esc .grid {
    margin-top: 14px;
  }
  .hint {
    font-size: 13px;
    color: var(--muted);
    margin: 10px 0 0;
  }
  .hint.warn {
    color: #e6b800;
    text-align: center;
  }
  .start {
    background: var(--felt);
    font-size: 18px;
    font-weight: 700;
    padding: 16px;
    border: 1px solid #1f8a52;
  }
</style>
