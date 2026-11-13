import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Move, MatchDifficulty, RoundOutcome } from '../data/types';
import { moodForRound, pickLine } from '../character/nash';
import { NashAvatar } from './NashAvatar';
import { RPSGlyph } from './RPSGlyph';
import { tally } from '../game/match';

interface RoundScreenProps {
  round: number;
  difficulty: MatchDifficulty;
  outcomes: RoundOutcome[];
  onSubmitMove: (move: Move) => void;
}

const MOVE_LABEL: Record<Move, string> = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };
const THINKING_MS = 650;

/**
 * Round input. `computer-vision-kiosk` has no shippable hand-landmark code yet (only its
 * own PLAN.md exists under D:\daksh\computer-vision-kiosk — checked before building this),
 * so this is a clean, documented tap-to-play stand-in rather than a silent scope cut: wiring
 * a camera gesture classifier in here later only needs to call `onSubmitMove(move)` with the
 * detected move instead of a button's onClick.
 */
export const RoundScreen: React.FC<RoundScreenProps> = ({ round, difficulty, outcomes, onSubmitMove }) => {
  const [thinking, setThinking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodRef = useRef(moodForRound(round, difficulty));
  const [line] = useState(() => pickLine(moodForRound(round, difficulty)));

  useEffect(() => {
    moodRef.current = moodForRound(round, difficulty);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, difficulty]);

  const handlePick = (move: Move) => {
    if (thinking) return; // guards a rapid double-tap the same way the store guards the screen.
    setThinking(true);
    timeoutRef.current = setTimeout(() => {
      onSubmitMove(move);
    }, THINKING_MS);
  };

  const { playerWins, aiWins } = tally(outcomes);
  const mood = moodForRound(round, difficulty);

  return (
    <motion.div
      data-testid="round-root"
      data-round={round}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-6 px-6"
    >
      <div className="font-mono text-xs uppercase tracking-widest text-muted" data-testid="score-line">
        Round {round} &middot; You {playerWins} &ndash; Nash {aiWins}
      </div>

      <NashAvatar mood={mood} size={88} />
      <p className="font-body text-paper text-lg text-center max-w-sm" data-testid="nash-line">
        {line}
      </p>

      {thinking ? (
        <div className="flex flex-col items-center gap-3 text-accent" data-testid="thinking-indicator">
          <RPSGlyph />
          <span className="font-mono text-xs uppercase tracking-widest text-muted">Nash is picking&hellip;</span>
        </div>
      ) : (
        <div className="flex gap-4" data-testid="move-buttons">
          {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
            <button
              key={move}
              type="button"
              data-testid={`move-${move}`}
              onClick={() => handlePick(move)}
              className="flex flex-col items-center gap-2 px-6 py-5 bg-panel border-2 border-panel-line text-paper hover:border-accent transition-colors cursor-pointer"
            >
              <RPSGlyph fixed={move} size={40} />
              <span className="font-mono text-xs uppercase tracking-wider">{MOVE_LABEL[move]}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};
