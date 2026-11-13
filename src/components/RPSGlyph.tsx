import React, { useEffect, useState } from 'react';
import type { Move } from '../data/types';
import { MOVES } from '../data/types';

/**
 * A minimal geometric rock/paper/scissors glyph set that morphs between the three shapes —
 * the "AI is thinking" mark between a player's pick and the reveal (PLAN.md "Mark"), and
 * also, since Nash has no face, the shape that IS Nash's mascot presence (see NashAvatar,
 * which reuses `glyphFor` and drives it by mood instead of by a fixed interval). Sharp,
 * square-cornered strokes throughout — no rounded caps/corners — to match the arcade-HUD
 * shape language, not the softer rounded style of real-or-ai-wall's panels.
 */
export function glyphFor(move: Move) {
  switch (move) {
    case 'rock':
      return <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="5" />;
    case 'paper':
      return <rect x="14" y="14" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="5" />;
    case 'scissors':
      return (
        <>
          <line x1="16" y1="16" x2="48" y2="48" stroke="currentColor" strokeWidth="5" strokeLinecap="square" />
          <line x1="48" y1="16" x2="16" y2="48" stroke="currentColor" strokeWidth="5" strokeLinecap="square" />
        </>
      );
  }
}

interface RPSGlyphProps {
  /** When set, shows that fixed move instead of cycling — used once the real pick is known. */
  fixed?: Move;
  size?: number;
  className?: string;
  intervalMs?: number;
}

export const RPSGlyph: React.FC<RPSGlyphProps> = ({ fixed, size = 48, className = '', intervalMs = 180 }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (fixed) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % MOVES.length), intervalMs);
    return () => clearInterval(id);
  }, [fixed, intervalMs]);

  const move = fixed ?? MOVES[index];

  return (
    <svg
      data-testid="rps-glyph"
      data-move={move}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
    >
      {glyphFor(move)}
    </svg>
  );
};
