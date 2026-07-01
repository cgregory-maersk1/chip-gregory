<script lang="ts">
  // Temporary shell — replaced by the real router (Setup → Table → Settlement)
  // once the engine and UI components land. Confirms the app + PWA boot.
  const version = '0.1.0';
</script>

<main>
  <div class="chip">CG</div>
  <h1>Chip Gregory</h1>
  <p>Home-game poker chip &amp; betting tracker</p>
  <small>v{version} — scaffold</small>
</main>

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
    padding: 24px;
    background: radial-gradient(circle at 50% 35%, var(--felt), var(--felt-dark));
  }
  .chip {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 32px;
    color: var(--felt-dark);
    background: var(--gold);
    border: 6px dashed #fff6;
    box-shadow: 0 8px 24px #0008;
  }
  h1 {
    margin: 8px 0 0;
    letter-spacing: 0.5px;
  }
  p {
    margin: 0;
    color: var(--muted);
  }
  small {
    color: var(--muted);
    opacity: 0.7;
  }
</style>
