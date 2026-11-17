import React from 'react';
import type { RoundOutcome } from '../data/types';
import { glyphFor } from './RPSGlyph';
import { MOVE_TILE, MOVE_LABEL, tileStyle } from './moveTheme';

interface HistoryStripProps {
  outcomes: RoundOutcome[];
}

/**
 * One chip per round: the colour tile is what you threw, the dot underneath says whether
 * Nash had predicted it (filled), predicted something else (hollow), or was just guessing (dash).
 * The ring shows who won the round.
 */
export const HistoryStrip: React.FC<HistoryStripProps> = ({ outcomes }) => {
  if (outcomes.length === 0) return <div className="h-11" aria-hidden="true" />;
  const recent = outcomes.slice(-11);
  return (
    <ol className="flex items-start justify-center gap-2 h-11" data-testid="history-strip" aria-label="Round history">
      {recent.map((o) => {
        const guessed = o.aiMode === 'random' || !o.predictedPlayerMove;
        const hit = !guessed && o.predictedPlayerMove === o.playerMove;
        return (
          <li
            key={o.round}
            title={`Round ${o.round}: you ${MOVE_LABEL[o.playerMove]}, Nash ${MOVE_LABEL[o.aiMove]}${
              guessed ? ' (guessing)' : hit ? ' (Nash read you)' : ' (you fooled Nash)'
            }`}
            className="flex flex-col items-center gap-1"
          >
            <span
              className={`grid place-items-center w-8 h-8 rounded-lg ${MOVE_TILE[o.playerMove].bg} ${MOVE_TILE[o.playerMove].fg} ${
                o.winner === 'player' ? 'ring-2 ring-win ring-offset-2 ring-offset-bone' : o.winner === 'ai' ? 'opacity-50' : ''
              }`}
              style={tileStyle(o.playerMove)}
            >
              <svg viewBox="0 0 100 100" className="w-4 h-4">
                {glyphFor(o.playerMove)}
              </svg>
            </span>
            <span
              className={`block w-2.5 h-2.5 rounded-full border-2 border-ink ${hit ? 'bg-ink' : ''} ${
                guessed ? 'w-3 h-0.5 rounded-none border-0 bg-ink/40' : ''
              }`}
            />
          </li>
        );
      })}
    </ol>
  );
};
