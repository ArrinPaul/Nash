import React from 'react';

interface ScoreHeaderProps {
  round: number;
  playerWins: number;
  aiWins: number;
  target: number;
  survival?: boolean;
  /** Overrides the right-hand name (e.g. a second player). */
  rightName?: string;
  leftName?: string;
  /** Current win streak; shown as a meter once it reaches 1. */
  streak?: number;
}

/** Big scoreboard shared by the round and reveal screens. The score line stays in the DOM
 * as a single readable string (`data-testid="score-line"`). */
export const ScoreHeader: React.FC<ScoreHeaderProps> = ({
  round,
  playerWins,
  aiWins,
  target,
  survival = false,
  leftName = 'You',
  rightName = 'Nash',
  streak = 0,
}) => {
  const lives = Math.max(0, 3 - aiWins);
  return (
    <header className="w-full flex items-end justify-between gap-4">
      <div>
        <div className="label">{leftName}</div>
        <div className="display text-6xl sm:text-7xl">{playerWins}</div>
        <div className="flex items-center gap-1 h-4 mt-1" data-testid="streak-meter" aria-label={`Win streak ${streak}`}>
          {streak > 0 &&
            Array.from({ length: Math.min(streak, 6) }).map((_, i) => (
              <span key={i} className="w-2.5 h-4 rounded-sm bg-rock" style={{ opacity: 0.5 + i * 0.1 }} />
            ))}
          {streak > 1 && <span className="text-xs font-semibold ml-1">{streak} streak</span>}
        </div>
      </div>

      <div className="text-center pb-2" data-testid="score-line">
        {survival ? (
          <>
            <div className="font-semibold text-lg">Survival &middot; Round {round}</div>
            <div className="flex justify-center gap-1.5 mt-2" aria-label={`${lives} of 3 lives left`}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 border-ink ${i < lives ? 'bg-ink' : ''}`}
                />
              ))}
            </div>
            <div className="sr-only">
              {lives} / 3 lives. Streak: {playerWins}
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold text-lg">Round {round}</div>
            <div className="text-sm text-mute">First to {target}</div>
            <div className="sr-only">
              You {playerWins} &ndash; Nash {aiWins}
            </div>
          </>
        )}
      </div>

      <div className="text-right">
        <div className="label">{rightName}</div>
        <div className="display text-6xl sm:text-7xl">{aiWins}</div>
      </div>
    </header>
  );
};
