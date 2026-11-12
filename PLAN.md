# Rock-Paper-Scissors vs AI — "Nash" — Design & Implementation Plan

> Companion stall project to `real-or-ai-wall`, reusing the gesture-recognition stack from
> `computer-vision-kiosk` (same hand-landmark detection) wired into a new, self-contained
> game loop. The educational hook here is different from every other project: this one
> demonstrates the AI *adapting to the player live*, not just classifying a static input.

## Intent and why

Rock-paper-scissors against a computer is a familiar enough format that nobody needs
onboarding — the twist that makes it worth building is an AI opponent that visibly learns
the player's tendencies over the course of a match, rather than picking randomly. That's a
genuine, demonstrable machine-learning behavior (sequence prediction) happening live in
front of the player, which is a stronger "this is real AI, not a gimmick" moment than a
fixed-odds game would be.

## Core loop

1. **Attract** — mascot intro, tap to start.
2. **Match setup** — best-of-7, single player vs AI.
3. **Each round**: player shows a gesture (via webcam, reusing hand-landmark detection),
   AI reveals its choice, round winner shown, running score updates.
4. **AI strategy (the actual feature)**: for the first 2-3 rounds, the AI picks randomly
   (not enough data yet — and the game says so). From round 4 onward, it weights its pick
   against the player's most frequent recent move (a simple frequency/n-gram model over the
   last 5 player moves), beating the player's most likely next move more often than chance.
   The AI's confidence/reasoning is shown after the match, not hidden.
5. **Match result** — win/loss, best streak, and a **"here's what I noticed about your
   play"** summary (e.g. "You played rock 60% of the time after a loss") — turns the AI's
   internal model into something the player can actually see and react to next match.
6. **Rematch** — loop, with the AI's model reset per match (fresh read each time, so it's
   fair to a new player and doesn't feel rigged against a specific person).

## Visual identity (distinct from every other stall project)

- **Mascot: Nash** — a simple geometric rock/paper/scissors glyph set that morphs between
  the three shapes (a minimal icon, not a cartoon hand), used as the "AI is thinking"
  animation between rounds. Named after game theory (a plain word choice, not a branded
  reference), fitting a strategy-game identity.
- **Palette**: near-black base with a single hot accent — red (`#c23b3b`-range) for an
  arcade/competitive "fight game" feel, intentionally more aggressive and high-contrast than
  any other project's palette, matching its head-to-head framing.

## Feature set

- Gesture-based input (reuses the hand-landmark detection approach from
  `computer-vision-kiosk` — share the underlying detection code/model rather than
  re-implementing it).
- Adaptive AI opponent (frequency-weighted prediction after an initial random-pick warm-up).
- Running score, streak tracking, best-of-7 match structure.
- Post-match "here's what I noticed" pattern summary.
- Local leaderboard: best win-streak today (same `localStorage`-backed pattern as
  `real-or-ai-wall`), with optional name entry.
- Difficulty option: "Fair" (AI only adapts after round 4, as above) vs "Ruthless" (AI
  adapts from round 2, for a replayer who wants a harder match) — a light difficulty knob
  without needing four full tiers like `real-or-ai-wall`.

## Education angle

A short **"How the AI is reading you"** explainer, reachable from the match-result screen,
using the player's own just-finished match as the worked example:

- **Sequence prediction** — the AI isn't guessing randomly; it's tracking a pattern in your
  recent choices and betting against the most likely one.
- **Why it struggles early** — not enough data in the first few rounds, named explicitly as
  the "cold start" problem (the same concept named in `taste-engine`'s glossary, reinforcing
  it across projects rather than only defining it once).
- **How to beat it** — a genuinely useful, honest tip: play less predictably (closer to
  random) and the frequency model has nothing to exploit. This turns the explainer into
  something the player can actually use on a rematch, not just read.

## Parent & student appeal

- **For the student**: competitive, replayable, and has a legitimate "beat the AI" goal
  with a visible leaderboard.
- **For the parent**: the "what I noticed about your play" summary is concrete, specific
  evidence that something real is being computed about their kid's behavior in real time —
  a tangible, easy-to-grasp demonstration of adaptive AI, not an abstract claim.

## Technical approach

- Reuse the gesture-detection approach/model from `computer-vision-kiosk` rather than
  building a second hand-tracking pipeline from scratch — confirm with that project's
  implementer whether the detection logic can be shared as a module or needs duplicating
  for deployment-isolation reasons.
- The frequency-prediction AI logic is pure and deterministic given a move history — write
  and unit-test it exactly like `real-or-ai-wall`'s scoring/deck modules, independent of the
  webcam/UI layer, so the actual "AI" can be verified correct without a camera in the loop.
- Offline-first, fullscreen kiosk mode, matching app icon, stall-day README — same baseline
  as every other project in this lineup.

## Constraints / non-goals

- The "AI" is a simple frequency/n-gram model, not a trained neural network — the educational
  copy must say so honestly rather than overselling it as deep learning.
- No persistent cross-session player profiling — the model resets every match, by design
  (stated above), both for fairness and to avoid anything resembling tracking an individual
  visitor across the day.
- No institutional branding.

## Open decisions for the builder

- Exact frequency-model weighting (how many recent moves to track, how strongly to weight
  recency vs overall frequency).
- Whether gesture detection is shared code with `computer-vision-kiosk` or an independent
  implementation — depends on how that project's codebase is actually structured.
