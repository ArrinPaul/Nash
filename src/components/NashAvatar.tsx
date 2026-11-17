import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { NashMood } from '../character/nash';
import { MOVES } from '../data/types';
import { glyphFor } from './RPSGlyph';

interface NashAvatarProps {
  mood: NashMood;
  size?: number;
  className?: string;
}

/**
 * Nash is an ink-black tile holding one of the three shapes. Mood is carried by behaviour,
 * not a face: `reading` drifts slowly and loosely between shapes (Nash doesn't know yet),
 * `locking-pattern` cycles faster and snaps harder, and the one-shot moods hold a single shape.
 */
const SNAP_SHAPE = {
  'won-round': 'scissors',
  'lost-round': 'rock',
  reviewing: 'paper',
} as const;

const CYCLE_MS: Record<NashMood, number> = {
  neutral: 900,
  reading: 900,
  'locking-pattern': 420,
  'won-round': 900,
  'lost-round': 900,
  reviewing: 900,
};

export const NashAvatar: React.FC<NashAvatarProps> = ({ mood, size = 64, className = '' }) => {
  const [index, setIndex] = useState(0);
  const snapShape = (SNAP_SHAPE as Partial<Record<NashMood, (typeof MOVES)[number]>>)[mood];
  const sharp = mood === 'locking-pattern';

  useEffect(() => {
    if (snapShape) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % MOVES.length), CYCLE_MS[mood]);
    return () => clearInterval(id);
  }, [mood, snapShape]);

  const move = snapShape ?? MOVES[index];

  return (
    <div
      data-testid="nash-avatar"
      data-mood={mood}
      data-move={move}
      role="img"
      aria-label={`Nash, ${mood.replace('-', ' ')}`}
      className={`shrink-0 grid place-items-center bg-ink text-sheet ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        ['--glyph-detail' as string]: '#15120e',
      }}
    >
      <motion.svg
        key={snapShape ? `${mood}-snap` : `${mood}-${index}`}
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 100 100"
        initial={snapShape ? { scale: 0.4, opacity: 0 } : { scale: sharp ? 0.75 : 0.9, opacity: 0.5, rotate: sharp ? -12 : 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={
          snapShape
            ? { type: 'spring', stiffness: 380, damping: 18 }
            : { duration: sharp ? 0.2 : 0.45, ease: 'easeOut' }
        }
      >
        {glyphFor(move)}
      </motion.svg>
    </div>
  );
};
