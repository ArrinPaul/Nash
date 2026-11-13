import { describe, it, expect } from 'vitest';
import { buildInsights } from './insights';
import type { Move, RoundOutcome } from '../data/types';

function makeOutcome(playerMove: Move, winner: RoundOutcome['winner'], round: number): RoundOutcome {
  return { round, playerMove, aiMove: 'paper', winner, aiMode: 'random', predictedPlayerMove: null };
}

describe('buildInsights', () => {
  it('is honest about too little data instead of inventing a pattern', () => {
    const history: Move[] = ['rock', 'paper'];
    const outcomes = [makeOutcome('rock', 'player', 1), makeOutcome('paper', 'ai', 2)];
    const insights = buildInsights(history, outcomes);
    expect(insights).toHaveLength(1);
    expect(insights[0].text).toMatch(/too short/i);
  });

  it('reports a clear move-frequency pattern computed from the real history', () => {
    const history: Move[] = ['rock', 'rock', 'rock', 'paper'];
    const outcomes = history.map((m, i) => makeOutcome(m, 'player', i + 1));
    const insights = buildInsights(history, outcomes);
    const freq = insights.find((i) => i.id === 'frequent-move');
    expect(freq).toBeDefined();
    expect(freq!.text).toContain('rock');
    expect(freq!.text).toContain('75%');
  });

  it('reports the after-a-loss tendency only with enough qualifying rounds', () => {
    const outcomes: RoundOutcome[] = [
      makeOutcome('rock', 'ai', 1),
      makeOutcome('rock', 'player', 2), // follows a loss -> rock
      makeOutcome('paper', 'ai', 3),
      makeOutcome('rock', 'player', 4), // follows a loss -> rock
      makeOutcome('scissors', 'player', 5),
    ];
    const history = outcomes.map((o) => o.playerMove);
    const insights = buildInsights(history, outcomes);
    const afterLoss = insights.find((i) => i.id === 'after-loss');
    expect(afterLoss).toBeDefined();
    expect(afterLoss!.text).toMatch(/after losing/i);
    expect(afterLoss!.text).toContain('rock');
  });

  it('does not report an after-loss tendency from a single qualifying round', () => {
    const outcomes: RoundOutcome[] = [
      makeOutcome('rock', 'ai', 1),
      makeOutcome('rock', 'player', 2),
      makeOutcome('paper', 'player', 3),
      makeOutcome('scissors', 'player', 4),
    ];
    const history = outcomes.map((o) => o.playerMove);
    const insights = buildInsights(history, outcomes);
    expect(insights.find((i) => i.id === 'after-loss')).toBeUndefined();
  });

  it('falls back to a no-clear-pattern message when nothing crosses the threshold', () => {
    const history: Move[] = ['rock', 'paper', 'scissors', 'rock', 'paper', 'scissors'];
    const outcomes = history.map((m, i) => makeOutcome(m, i % 2 === 0 ? 'player' : 'ai', i + 1));
    const insights = buildInsights(history, outcomes);
    expect(insights.some((i) => i.id === 'no-clear-pattern' || i.id === 'repeat-low')).toBe(true);
  });
});
