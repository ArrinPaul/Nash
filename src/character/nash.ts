import type { RoundWinner, MatchDifficulty, MatchLength } from '../data/types';
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
export function moodForRound(round: number, difficulty: MatchDifficulty, matchLength: MatchLength = 7): NashMood {
  return isReadingRound(round, difficulty, matchLength) ? 'reading' : 'locking-pattern';
}

/** The mood Nash should react with right after a round resolves, from Nash's own
 * perspective: "won-round" means the AI won that round, "lost-round" means the player did.
 * A tie keeps Nash in whatever reading/locking-pattern state the round was played in,
 * since nothing was actually proven either way. */
export function moodForOutcome(
  winner: RoundWinner,
  round: number,
  difficulty: MatchDifficulty,
  matchLength: MatchLength = 7
): NashMood {
  if (winner === 'ai') return 'won-round';
  if (winner === 'player') return 'lost-round';
  return moodForRound(round, difficulty, matchLength);
}

export { ADAPTIVE_FROM_ROUND };

/**
 * Conversation starters for a parent or staff member who is watching, not playing — turns a
 * passive observer at the stall into an active participant, per the brief's "ask your kid"
 * feature. Rotated on the attract screen; each one only works because the match mechanics
 * behind it are real (the AI genuinely does start blind and switch strategy), not scripted.
 */
export const ASK_YOUR_KID_LINES: string[] = [
  "Ask them: why did the AI start copying its picks after a few rounds?",
  'Ask them: which move did they play the most — and did they notice?',
  'Ask them: how would they trick an AI that is watching for patterns?',
];
