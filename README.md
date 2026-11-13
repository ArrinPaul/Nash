# Nash — Rock Paper Scissors vs AI

A kiosk game for the Daksh AIML stall: best-of-seven rock-paper-scissors against "Nash," an
AI opponent that starts blind and genuinely learns your tendencies mid-match using a simple
frequency/n-gram model — not a scripted difficulty curve. Runs fully offline after the first
load — no network needed on the day.

## Input: tap-to-play (gesture input is a follow-up, not a silent cut)

This build uses on-screen Rock / Paper / Scissors buttons as the input method. The plan's
companion project, `computer-vision-kiosk`, only has a design doc (`D:\daksh\computer-vision-kiosk\PLAN.md`)
checked in — there is no shippable hand-landmark detection code yet to reuse or share. Wiring
a camera-based gesture classifier in later is a small, contained change: `RoundScreen`
(`src/components/RoundScreen.tsx`) already isolates input behind a single call,
`onSubmitMove(move)` — a gesture classifier just needs to call that instead of a button's
`onClick`. Treat this as deliberate scope for this build, not a missing feature.

## Running it at the stall

**Before the event**, with internet access, on the kiosk laptop:

```
npm install
npm run build
```

This produces a `dist/` folder — a complete, self-contained static site. You only need to do
this once; after that the app works fully offline.

**On the day**, serve that `dist/` folder locally and open it in Chrome:

```
npm run preview
```

This starts a local server (prints a `http://localhost:...` address) and does **not** need
internet. Open that address in Chrome.

If `npm` isn't available on the kiosk laptop itself, copy the `dist/` folder over and serve it
with any static file server, e.g. Python (`python -m http.server` from inside `dist/`), then
open `http://localhost:8000`.

### Go fullscreen

Click the **Fullscreen** button in the top-right corner of the app. This hides the browser's
address bar and tabs so it reads as a real kiosk, not "a website in a browser." Press `Esc` to
exit.

### Resetting between visitors

Nothing to do manually — the app automatically returns to the attract screen after 45 seconds
of no interaction.

### Checking it's actually working offline

After the first successful load, open Chrome DevTools → Application tab → confirm a service
worker is registered, then toggle DevTools' "Offline" network throttling and reload. The app
should still load and play normally.

## How the AI actually works (for staff, not just players)

Nash is a plain frequency model, not a trained neural network — the in-app explainer says so
honestly. Mechanics, by difficulty:

- **Fair**: random picks through round 3; from round 4 it predicts your most frequent move
  over your last 5 picks and plays the counter to that prediction 65% of the time (otherwise
  still random, so a player who varies their moves can't be perfectly read even late in a
  match).
- **Ruthless**: random only on round 1; adapts from round 2, and counters its prediction 90%
  of the time once adaptive.

Both the round threshold and the counter-probability differ between the two difficulties —
not just the on-screen label.

**Staff talking point**: Watch the "what I noticed" screen after the match — it names the
actual pattern it found in that specific player's moves (most-played move, tendency after a
loss, how often they repeated their last pick). That's the model's real output, computed from
that match's history, not a scripted line chosen by win/loss.

**If a round's reveal clearly didn't match what someone tapped** (a slip, not a camera
misread — there's no camera yet), the reveal screen has a "Redo this pick" button that
discards the round and lets them pick again, instead of forcing a frustrating scored loss.

## At the end of the day

Each completed match's best win-streak is recorded in a local leaderboard, stored only in
that browser's local storage on that laptop (`localStorage`, key `rps-vs-ai:leaderboard`).
The top 5 "best win-streak today" entries show on the match-result screen. The leaderboard
only resets if the browser's site data for this app is cleared.

## Troubleshooting

- **App seems frozen or stuck**: reload the page (`F5` or `Ctrl+R`). The idle timer and
  service worker will recover state automatically.
- **Fullscreen exited unexpectedly** (e.g. someone pressed `Esc`): click the Fullscreen
  button again.
- **A player feels a round was scored wrong**: use "Redo this pick" on the reveal screen
  before continuing — it discards that round cleanly, no scored loss.

## Development

```
npm install       # install dependencies
npm run dev        # local dev server with hot reload
npm run test        # run the test suite (Vitest)
npm run build       # production build into dist/
npm run preview     # serve the production build locally
```

Built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, and Zustand — same stack as
`real-or-ai-wall`. Core game logic (`src/game/ai.ts`, `src/game/match.ts`,
`src/game/insights.ts`) is pure and unit-tested independent of the UI, so the AI's actual
behavior can be verified correct without a browser in the loop.
