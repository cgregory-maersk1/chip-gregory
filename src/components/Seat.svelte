<script lang="ts">
  import type { Player } from '../engine/types';
  import { chips } from '../lib/format';

  let {
    player,
    acting = false,
    dealer = false,
    blind = null,
    winner = false,
  }: {
    player: Player;
    acting?: boolean;
    dealer?: boolean;
    blind?: 'SB' | 'BB' | null;
    winner?: boolean;
  } = $props();

  const folded = $derived(player.status === 'folded');
  const out = $derived(player.status === 'sittingOut' || player.status === 'cashedOut');
</script>

<div class="seat" class:acting class:folded class:out class:winner>
  {#if dealer}<span class="btn-dealer" title="Dealer">D</span>{/if}
  <div class="name">{player.name}</div>
  <div class="stack">{chips(player.stack)}</div>
  <div class="badges">
    {#if blind}<span class="badge blind">{blind}</span>{/if}
    {#if player.status === 'allIn'}<span class="badge allin">ALL-IN</span>{/if}
    {#if player.status === 'folded'}<span class="badge fold">folded</span>{/if}
    {#if player.status === 'cashedOut'}<span class="badge out">cashed out</span>{/if}
    {#if player.status === 'sittingOut'}<span class="badge out">sitting out</span>{/if}
  </div>
  {#if player.committedThisStreet > 0}
    <div class="bet">{chips(player.committedThisStreet)}</div>
  {/if}
</div>

<style>
  .seat {
    position: relative;
    width: 92px;
    padding: 8px 6px;
    border-radius: 12px;
    background: #0c1c14e6;
    border: 2px solid #2a4335;
    text-align: center;
    transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
  }
  .seat.acting {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px #e7c34c55, 0 0 18px #e7c34c66;
  }
  .seat.folded {
    opacity: 0.45;
  }
  .seat.out {
    opacity: 0.35;
    filter: grayscale(0.6);
  }
  .seat.winner {
    border-color: var(--ok);
    box-shadow: 0 0 0 3px #2ecc7155, 0 0 20px #2ecc7188;
  }
  .name {
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stack {
    font-size: 18px;
    font-weight: 800;
    color: var(--gold);
  }
  .badges {
    display: flex;
    gap: 3px;
    justify-content: center;
    flex-wrap: wrap;
    min-height: 4px;
  }
  .badge {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 6px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .badge.blind {
    background: #23415a;
    color: #bcdcff;
  }
  .badge.allin {
    background: #6b1d16;
    color: #ffd0c8;
  }
  .badge.fold,
  .badge.out {
    background: #2a2a2a;
    color: #b9b9b9;
    text-transform: uppercase;
  }
  .btn-dealer {
    position: absolute;
    top: -10px;
    right: -10px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    color: #111;
    font-weight: 800;
    font-size: 13px;
    display: grid;
    place-items: center;
    box-shadow: 0 2px 6px #0008;
  }
  .bet {
    position: absolute;
    bottom: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--chip-red);
    color: #fff;
    font-weight: 700;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    border: 2px solid #fff3;
    white-space: nowrap;
  }
</style>
