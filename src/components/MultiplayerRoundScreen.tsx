import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Move } from '../data/types';
import { RPSGlyph } from './RPSGlyph';
import { MOVE_LABEL } from './moveTheme';
import { resolveRound } from '../game/match';
import { playSelectSound, playClashSound, playRoundWinSound, playRoundTieSound } from '../audio/sound';

interface MultiplayerRoundScreenProps {
  round: number;
  p1Name: string;
  p2Name: string;
  p1Score: number;
  p2Score: number;
  targetWins: number;
  onRoundComplete: (p1Move: Move, p2Move: Move) => void;
  onExit: () => void;
}

export const MultiplayerRoundScreen: React.FC<MultiplayerRoundScreenProps> = ({
  round,
  p1Name,
  p2Name,
  p1Score,
  p2Score,
  targetWins,
  onRoundComplete,
  onExit,
}) => {
  const [p1Move, setP1Move] = useState<Move | null>(null);
  const [p2Move, setP2Move] = useState<Move | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealedResult, setRevealedResult] = useState<{
    p1: Move;
    p2: Move;
    winner: 'player1' | 'player2' | 'tie';
  } | null>(null);

  const handleP1Choice = useCallback((move: Move) => {
    if (revealing || p1Move) return;
    playSelectSound();
    setP1Move(move);
  }, [revealing, p1Move]);

  const handleP2Choice = useCallback((move: Move) => {
    if (revealing || p2Move) return;
    playSelectSound();
    setP2Move(move);
  }, [revealing, p2Move]);

  // Keyboard shortcut listener for both players
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (revealing) return;
      const key = e.key.toLowerCase();

      // Player 1 controls: A=Rock, S=Paper, D=Scissors
      if (key === 'a') handleP1Choice('rock');
      else if (key === 's') handleP1Choice('paper');
      else if (key === 'd') handleP1Choice('scissors');

      // Player 2 controls: J=Rock, K=Paper, L=Scissors
      if (key === 'j') handleP2Choice('rock');
      else if (key === 'k') handleP2Choice('paper');
      else if (key === 'l') handleP2Choice('scissors');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleP1Choice, handleP2Choice, revealing]);

  // When both lock in, trigger the clash!
  useEffect(() => {
    if (p1Move && p2Move && !revealing) {
      setRevealing(true);
      playClashSound();

      const roundWinner = resolveRound(p1Move, p2Move);
      const winner = roundWinner === 'player' ? 'player1' : roundWinner === 'ai' ? 'player2' : 'tie';

      setRevealedResult({ p1: p1Move, p2: p2Move, winner });

      if (winner === 'tie') {
        playRoundTieSound();
      } else {
        playRoundWinSound();
      }

      const timer = setTimeout(() => {
        onRoundComplete(p1Move, p2Move);
        setP1Move(null);
        setP2Move(null);
        setRevealing(false);
        setRevealedResult(null);
      }, 1300);

      return () => clearTimeout(timer);
    }
  }, [p1Move, p2Move, revealing, onRoundComplete]);

  const seats = [
    {
      name: p1Name || 'Player 1',
      score: p1Score,
      move: p1Move,
      keys: ['A', 'S', 'D'],
      choose: handleP1Choice,
      revealed: revealedResult?.p1,
      dark: false,
    },
    {
      name: p2Name || 'Player 2',
      score: p2Score,
      move: p2Move,
      keys: ['J', 'K', 'L'],
      choose: handleP2Choice,
      revealed: revealedResult?.p2,
      dark: true,
    },
  ];
  const moves = ['rock', 'paper', 'scissors'] as Move[];

  return (
    <div className="w-full min-h-screen flex flex-col gap-6 pt-20 pb-6 px-5 sm:px-10 max-w-6xl mx-auto select-none">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onExit} className="btn !min-h-10 !px-4 text-sm">
          &larr; Menu
        </button>
        <div className="text-center">
          <div className="font-semibold text-lg">Round {round}</div>
          <div className="text-sm text-mute">First to {targetWins}</div>
        </div>
        <div className="w-20" aria-hidden="true" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 flex-1">
        {seats.map((seat) => (
          <section
            key={seat.keys[0]}
            className={`rounded-[2rem] p-6 flex flex-col gap-5 ${seat.dark ? 'bg-ink text-bone' : 'bg-bone-deep text-ink'}`}
            style={{ ['--glyph-detail' as string]: seat.dark ? '#15120e' : '#e2dac8' }}
          >
            <div className="flex items-end justify-between">
              <h3 className="display text-4xl truncate">{seat.name}</h3>
              <div className="display text-7xl">{seat.score}</div>
            </div>

            <div className="flex-1 min-h-40 grid place-items-center">
              {seat.revealed ? (
                <motion.div
                  initial={{ scale: 0.3, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                  className="flex flex-col items-center gap-2"
                >
                  <RPSGlyph fixed={seat.revealed} size={120} className={seat.dark ? 'text-sheet' : 'text-ink'} />
                  <span className="display text-3xl">{MOVE_LABEL[seat.revealed]}</span>
                </motion.div>
              ) : seat.move ? (
                <div className="rounded-full border-2 border-current px-5 py-2 font-semibold">Locked in</div>
              ) : (
                <p className="opacity-60 text-center">Pick with {seat.keys.join(' / ')} or tap</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {moves.map((move, idx) => (
                <button
                  key={move}
                  type="button"
                  disabled={seat.move !== null || revealing}
                  onClick={() => seat.choose(move)}
                  className={`rounded-2xl py-3 flex flex-col items-center gap-1 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed border-2 border-current transition-transform active:translate-y-0.5 ${
                    seat.dark ? 'hover:bg-bone/10' : 'hover:bg-ink/10'
                  }`}
                >
                  <RPSGlyph fixed={move} size={36} />
                  <span className="text-sm font-semibold">
                    {MOVE_LABEL[move]} <span className="kbd">{seat.keys[idx]}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="h-16 flex items-center justify-center">
        <AnimatePresence>
          {revealedResult && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="display text-4xl sm:text-5xl text-center"
            >
              {revealedResult.winner === 'player1'
                ? `${p1Name || 'Player 1'} takes it`
                : revealedResult.winner === 'player2'
                  ? `${p2Name || 'Player 2'} takes it`
                  : 'Tied round'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
