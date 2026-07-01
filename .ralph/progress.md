# Ralph progress log

- Scaffolded Vite + Svelte 5 + TS + PWA + Vitest; dependency-free PNG icon generator.
- Built pure betting engine (blinds/escalation, legal actions, street advance, min-raise,
  uncalled-bet return, side pots/all-ins/splits, settlement) with 29 unit tests.
- Added game store: localStorage autosave, undo stack, resume (4 tests).
- Built Svelte UI: Setup, poker-table Table, ActionBar, Showdown, Manage, History, Settlement;
  app router with resume prompt; wake-lock.
- Verified: 33 tests pass, svelte-check clean, production build + PWA OK, preview smoke-tested.
- Deployed: repo made public, GitHub Pages (Actions) live at
  https://cgregory-maersk1.github.io/chip-gregory/
