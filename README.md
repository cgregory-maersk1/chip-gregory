# Chip Gregory 🃏

A phone-installable **home-game poker chip & betting tracker** — the app *is* the chips.
Pass one device around the table, tap each player's action, and it runs the pot (including
side pots on all-ins), then pays the winner and settles up the money at the end.

**▶ Live app: https://cgregory-maersk1.github.io/chip-gregory/**

## Install on your phone

1. Open the link above in your phone's browser.
2. **iPhone:** Share → *Add to Home Screen*. **Android:** menu → *Install app / Add to Home Screen*.
3. It launches full-screen with its own icon and works **offline** — no accounts, no internet needed at the table.

## What it does

- **Setup** — pick players (2–10), name & order them, set the small/big blind (min bet),
  buy-in, chip value ($ per chip), and an optional **blinds-increase** schedule (every N hands or minutes).
- **Play** — No-Limit Texas Hold'em betting on one shared device: **Fold / Check / Call / Bet /
  Raise** (with a slider + ½-pot / pot presets) and **All-in**. The pot, each stack, the dealer
  button and blinds update live on a poker-table view.
- **Side pots** — when players are all-in for different amounts, it builds the main + side pots
  automatically and lets you pick the winner(s) of each (splits supported, odd chip handled).
- **Money** — re-buys / top-ups / cash-outs anytime; at the end a **settlement** screen shows each
  player's net win/loss and a minimal "who pays whom" list.
- **Safety nets** — one-tap **Undo**, **auto-save & resume** (survives a refresh / phone-lock), and
  a **hand-history** log for disputes.

## Develop

Node 20+ / npm.

```bash
npm install
npm run dev       # local dev server
npm run test      # Vitest — betting/side-pot/settlement suites (the poker rules)
npm run check     # svelte-check + tsc
npm run build     # production build (PWA) into dist/
npm run preview   # serve the production build
```

Pushing to `main` runs the tests and deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## How it's built

- **Svelte 5 + Vite + TypeScript**, installable **PWA** (vite-plugin-pwa / Workbox).
- A **pure, unit-tested betting engine** (`src/engine/`) is kept separate from the Svelte UI
  (`src/components/`). The engine handles legal actions, street progression, min-raise rules,
  uncalled-bet returns, side-pot construction and settlement — all covered by Vitest.
- State persists to `localStorage`; the UI never mutates engine state directly (reducer + store).
