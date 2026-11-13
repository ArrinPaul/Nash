import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { NashMood } from '../character/nash';
import type { Move } from '../data/types';
import { MOVES } from '../data/types';
import { glyphFor } from './RPSGlyph';

interface NashAvatarProps {
  mood: NashMood;
  size?: number;
  className?: string;
}

/**
 * Nash's actual presence — not a face. PLAN.md's "Mark" section describes the identity as
 * "a simple geometric rock/paper/scissors glyph set that morphs between the three shapes,"
 * so this component IS that mark: mood is expressed through the glyph's cycling speed,
 * snap behavior, and color, never through eyes or a mouth drawn on top of a circle.
 *
 * - `reading` / `neutral`: a slow, loose drift between all three shapes — Nash genuinely
 *   doesn't know yet, so the morph looks uncertain, not purposeful.
 * - `locking-pattern`: a faster, sharper cycle with a harder pop on each change — Nash has
 *   committed to reading a pattern, so the morph itself looks more deliberate.
 * - `won-round` / `lost-round` / `reviewing`: no cycling at all — Nash snaps to and holds a
 *   single shape, because the moment has already resolved.
 */

/** Which shape the one-shot moods snap to and hold. Picked for what they suggest, not a
 * literal "this beat your actual move" claim: scissors for a decisive win, rock for a flat
 * loss, paper for a steady, already-laid-out review. */
const SNAP_SHAPE: Partial<Record<NashMood, Move>> = {
  'won-round': 'scissors',
  'lost-round': 'rock',
  reviewing: 'paper',
};

const CYCLE_MS: Record<NashMood, number> = {
  neutral: 900,
  reading: 900,
  'locking-pattern': 420,
  'won-round': 900,
  'lost-round': 900,
  reviewing: 900,
};

const MOOD_COLOR: Record<NashMood, string> = {
  neutral: 'text-muted',
  reading: 'text-muted',
  'locking-pattern': 'text-accent',
  'won-round': 'text-accent',
  'lost-round': 'text-muted',
  reviewing: 'text-accent',
};

export const NashAvatar: React.FC<NashAvatarProps> = ({ mood, size = 64, className = '' }) => {
  const [index, setIndex] = useState(0);
  const snapShape = SNAP_SHAPE[mood];
  const sharp = mood === 'locking-pattern';

  useEffect(() => {
    if (snapShape) return; // one-shot moods hold a fixed shape — nothing to cycle.
    const id = setInterval(() => setIndex((i) => (i + 1) % MOVES.length), CYCLE_MS[mood]);
    return () => clearInterval(id);
  }, [mood, snapShape]);

  const move = snapShape ?? MOVES[index];

  return (
    <motion.svg
      data-testid="nash-avatar"
      data-mood={mood}
      data-move={move}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`${MOOD_COLOR[mood]} ${className}`}
      animate={
        snapShape
          ? undefined
          : sharp
            ? { rotate: [0, -3, 3, 0], scale: [1, 1.05, 1] }
            : { opacity: [0.7, 1, 0.7] }
      }
      transition={
        snapShape
          ? undefined
          : { duration: sharp ? 0.9 : 1.8, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <rect x="2" y="2" width="60" height="60" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <motion.g
        key={snapShape ? `${mood}-snap` : `${mood}-${index}`}
        initial={snapShape ? { scale: 0.4, opacity: 0 } : { scale: sharp ? 0.8 : 0.92, opacity: 0.4, rotate: sharp ? -10 : 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={
          snapShape
            ? { duration: 0.32, ease: 'easeOut' }
            : { duration: sharp ? 0.22 : 0.5, ease: sharp ? 'backOut' : 'easeOut' }
        }
      >
        {glyphFor(move)}
      </motion.g>
    </motion.svg>
  );
};
