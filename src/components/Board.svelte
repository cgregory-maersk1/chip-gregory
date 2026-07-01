<script lang="ts">
  // Decorative community-card row. Shows `count` face-down card backs
  // (0 pre-flop, 3 flop, 4 turn, 5 river). Newly dealt cards animate in;
  // cards already on the board stay put because each slot is keyed by index.
  let { count = 0 }: { count?: number } = $props();

  const slots = $derived(Array.from({ length: count }, (_, i) => i));

  // Stagger only the three flop cards; the lone turn/river card deals immediately.
  function delay(i: number): number {
    return i < 3 ? i * 110 : 0;
  }
</script>

<div class="board" class:empty={count === 0} aria-hidden="true">
  {#each slots as i (i)}
    <div class="card" style={`--d:${delay(i)}ms`}>
      <div class="back">
        <span class="mono">CG</span>
      </div>
    </div>
  {/each}
</div>

<style>
  .board {
    display: flex;
    gap: 6px;
    justify-content: center;
    align-items: center;
    min-height: 64px;
    perspective: 700px;
  }
  .board.empty {
    min-height: 0;
  }
  .card {
    width: 46px;
    height: 64px;
    transform-style: preserve-3d;
    animation: deal 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) both;
    animation-delay: var(--d);
  }
  .back {
    width: 100%;
    height: 100%;
    border-radius: 7px;
    background: repeating-linear-gradient(
        45deg,
        #0d5c34 0 6px,
        #0a4a2a 6px 12px
      ),
      radial-gradient(circle at 50% 40%, #12854b, #0a4326);
    border: 2px solid var(--gold);
    box-shadow: 0 6px 14px #0007, inset 0 0 0 2px #ffffff22;
    display: grid;
    place-items: center;
  }
  .mono {
    font-weight: 800;
    font-size: 15px;
    color: var(--gold);
    letter-spacing: -1px;
    text-shadow: 0 1px 2px #0008;
    opacity: 0.9;
  }

  @keyframes deal {
    0% {
      opacity: 0;
      transform: translate(34px, -74px) rotateY(90deg) rotateZ(12deg) scale(0.82);
    }
    55% {
      opacity: 1;
    }
    100% {
      opacity: 1;
      transform: translate(0, 0) rotateY(0deg) rotateZ(0deg) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card {
      animation: none;
    }
  }
</style>
