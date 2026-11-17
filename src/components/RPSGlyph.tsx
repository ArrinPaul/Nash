import React, { useEffect, useState } from 'react';
import type { Move } from '../data/types';
import { MOVES } from '../data/types';

/**
 * The three hand-cut shapes. Solid fills in `currentColor`; interior detail (paper lines,
 * the scissor pivot) uses `--glyph-detail` so a glyph reads on any tile colour.
 * Shared by the move tiles, the reveal, and Nash's mark.
 */
export function glyphFor(move: Move) {
  switch (move) {
    case 'rock':
      return (
        <>
          <path
            d="M16 60 L24 34 L46 16 L74 22 L88 46 L78 76 L48 86 L24 78 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d="M46 16 L44 44 L24 34 M44 44 L78 76 M74 22 L58 40"
            fill="none"
            stroke="var(--glyph-detail, #efe9dc)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
        </>
      );
    case 'paper':
      return (
        <>
          <path
            d="M22 10 H60 L82 32 V90 H22 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path d="M60 10 V32 H82" fill="var(--glyph-detail, #efe9dc)" opacity="0.7" />
          <path
            d="M34 52 H70 M34 64 H70 M34 76 H56"
            stroke="var(--glyph-detail, #efe9dc)"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.7"
          />
        </>
      );
    case 'scissors':
      return (
        <>
          <path
            d="M50 54 L24 8 L34 4 L58 46 Z M50 54 L76 8 L66 4 L42 46 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="76" r="13" fill="none" stroke="currentColor" strokeWidth="7" />
          <circle cx="68" cy="76" r="13" fill="none" stroke="currentColor" strokeWidth="7" />
          <path d="M40 66 L50 54 L60 66" fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
          <circle cx="50" cy="52" r="3.5" fill="var(--glyph-detail, #efe9dc)" />
        </>
      );
  }
}

interface RPSGlyphProps {
  /** When set, shows that fixed move instead of cycling. */
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
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      {glyphFor(move)}
    </svg>
  );
};
