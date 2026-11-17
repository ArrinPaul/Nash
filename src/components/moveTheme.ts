import type { CSSProperties } from 'react';
import type { Move } from '../data/types';

/** One flat colour per move, used everywhere a move is shown. */
export const MOVE_TILE: Record<Move, { bg: string; fg: string; hex: string; detail: string }> = {
  rock: { bg: 'bg-rock', fg: 'text-ink', hex: '#f2603a', detail: '#f2603a' },
  paper: { bg: 'bg-sheet', fg: 'text-ink', hex: '#f4d24a', detail: '#f4d24a' },
  scissors: { bg: 'bg-blade', fg: 'text-bone', hex: '#2c3cff', detail: '#2c3cff' },
};

export function tileStyle(move: Move): CSSProperties {
  return { ['--glyph-detail' as string]: MOVE_TILE[move].detail };
}

export const MOVE_LABEL: Record<Move, string> = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };
