import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NashBrain } from './NashBrain';
import { HistoryStrip } from './HistoryStrip';
import type { Move, RoundOutcome } from '../data/types';

afterEach(() => vi.useRealTimers());

const base = { archetype: 'nash' as const, difficulty: 'ruthless' as const, matchLength: 7 as const };

function outcome(round: number, playerMove: Move, predicted: Move | null): RoundOutcome {
  return {
    round,
    playerMove,
    aiMove: 'rock',
    winner: 'tie',
    aiMode: predicted ? 'adaptive' : 'random',
    predictedPlayerMove: predicted,
  };
}

describe('NashBrain', () => {
  it('says Nash has nothing to go on before any throw', () => {
    render(<NashBrain {...base} history={[]} outcomes={[]} round={1} />);
    expect(screen.getByText(/nothing to go on/i)).toBeInTheDocument();
  });

  it('shows the real recent mix and what Nash is betting on once it is reading', () => {
    const history: Move[] = ['rock', 'rock', 'rock', 'paper'];
    render(<NashBrain {...base} history={history} outcomes={[]} round={5} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/is betting on/i)).toBeInTheDocument();
  });

  it('on the reveal, says whether Nash read you or you fooled it', () => {
    const history: Move[] = ['rock', 'rock', 'paper'];
    render(<NashBrain {...base} history={history} outcomes={[]} round={3} actual="paper" predicted="rock" />);
    expect(screen.getByText(/you fooled it/i)).toBeInTheDocument();
  });
});

describe('HistoryStrip', () => {
  it('renders one chip per round', () => {
    render(<HistoryStrip outcomes={[outcome(1, 'rock', null), outcome(2, 'paper', 'paper')]} />);
    expect(screen.getByTestId('history-strip').children).toHaveLength(2);
  });
});
