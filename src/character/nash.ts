import type { RoundWinner, MatchDifficulty } from '../data/types';
import { ADAPTIVE_FROM_ROUND, isReadingRound } from '../game/ai';

/**
 * Nash's moods track real match state, not a between-round decoration. `reading` and
 * `locking-pattern` are gated on the exact same round threshold the AI itself uses
 * (ADAPTIVE_FROM_ROUND) — Nash can never claim to be reading a pattern before the model
 * has actually started weighting against one (PLAN.md risk #2).
 */
export type NashMood = 'neutral' | 'reading' | 'locking-pattern' | 'won-round' | 'lost-round' | 'reviewing';

const LINES: Record<NashMood, string[]> = {
  neutral: [
    "I'm Nash. I learn as we go.",
    'Best of seven. No tricks, just patterns.',
    'Ready when you are.',
  ],
  reading: [
    'Not enough data yet. Pure guess.',
    'Flip a coin, basically.',
    "I haven't seen enough of you yet.",
  ],
  'locking-pattern': [
    "I've seen this before.",
    'Betting against your last move.',
    'Starting to see a shape here.',
  ],
  'won-round': ['Got you.', 'Read that one right.', 'Called it.'],
  'lost-round': ['Lucky.', 'Okay, that one was clean.', 'Didn’t see that coming.'],
  reviewing: [
    "Here's what gave you away.",
    'This is what I actually tracked — no scripted roast.',
    'Let me show my work.',
  ],
};

export function pickLine(mood: NashMood, rng: () => number = Math.random): string {
  const lines = LINES[mood];
  const index = Math.min(lines.length - 1, Math.floor(rng() * lines.length));
  return lines[index];
}

/** The mood Nash should be in while a round is in progress (before the reveal) — purely a
 * function of the real round number and difficulty, same gate the AI's own pick uses. */
export function moodForRound(round: number, difficulty: MatchDifficulty): NashMood {
  return isReadingRound(round, difficulty) ? 'reading' : 'locking-pattern';
}

/** The mood Nash should react with right after a round resolves, from Nash's own
 * perspective: "won-round" means the AI won that round, "lost-round" means the player did.
 * A tie keeps Nash in whatever reading/locking-pattern state the round was played in,
 * since nothing was actually proven either way. */
export function moodForOutcome(winner: RoundWinner, round: number, difficulty: MatchDifficulty): NashMood {
  if (winner === 'ai') return 'won-round';
  if (winner === 'player') return 'lost-round';
  return moodForRound(round, difficulty);
}

export { ADAPTIVE_FROM_ROUND };
