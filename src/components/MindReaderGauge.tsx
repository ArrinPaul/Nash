import React from 'react';
import type { Move, MatchDifficulty, MatchLength } from '../data/types';
import { isReadingRound, counterTo } from '../game/ai';

interface MindReaderGaugeProps {
  round: number;
  difficulty: MatchDifficulty;
  history?: Move[];
  mode?: 'live-scanner' | 'post-round-reveal';
  predictedMove?: Move | null;
  aiMode?: 'random' | 'adaptive';
  matchLength?: MatchLength;
}

export const MindReaderGauge: React.FC<MindReaderGaugeProps> = ({
  round,
  difficulty,
  mode = 'live-scanner',
  predictedMove,
  aiMode,
  matchLength = 7,
}) => {
  const isReading = isReadingRound(round, difficulty, matchLength);

  if (mode === 'live-scanner') {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-full border-2 border-ink px-4 py-1.5 text-sm font-semibold">
        <span className={`w-2.5 h-2.5 rounded-full ${isReading ? 'bg-mute/50' : 'bg-rock'}`} />
        {isReading ? 'Still guessing — no data on you yet' : `Reading your pattern · ${difficulty}`}
      </div>
    );
  }

  return (
    <div className="max-w-md border-t-2 border-ink pt-3 text-base text-ink/85" data-testid="mind-reader">
      {aiMode === 'random' || !predictedMove ? (
        <p>
          <strong>Nash guessed.</strong> It had too little history to predict you, so it picked at random.
        </p>
      ) : (
        <p>
          <strong>Nash expected {predictedMove}</strong> from you and played{' '}
          <strong>{counterTo(predictedMove)}</strong> to beat it.
        </p>
      )}
    </div>
  );
};
