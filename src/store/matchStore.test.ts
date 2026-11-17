import { describe, it, expect, beforeEach } from 'vitest';
import { createMatchStore } from './matchStore';
import { loadLeaderboard } from '../leaderboard/leaderboard';
import { bestPlayerStreak, matchResult } from '../game/match';

beforeEach(() => {
  localStorage.clear();
});

describe('matchStore', () => {
  it('starts on the attract screen', () => {
    const store = createMatchStore();
    expect(store.getState().screen).toBe('attract');
  });

  it('setup -> difficulty -> startMatch moves to round 1 with a clean history', () => {
    const store = createMatchStore();
    store.getState().goToSetup();
    store.getState().setDifficulty('fair');
    store.getState().startMatch();
    const state = store.getState();
    expect(state.screen).toBe('round');
    expect(state.round).toBe(1);
    expect(state.history).toEqual([]);
  });

  it('submitMove resolves a round and moves to reveal; a second call before continue is a no-op', () => {
    const store = createMatchStore(() => 0);
    store.getState().setDifficulty('fair');
    store.getState().startMatch();
    store.getState().submitMove('rock');
    expect(store.getState().screen).toBe('reveal');
    expect(store.getState().history).toEqual(['rock']);

    // Rapid double-submit guard: screen is no longer 'round', so this must not register.
    store.getState().submitMove('paper');
    expect(store.getState().history).toEqual(['rock']);
  });

  it('never adapts before the difficulty threshold, even with a strong player pattern', () => {
    const store = createMatchStore(() => 0.1);
    store.getState().setDifficulty('fair');
    store.getState().startMatch();

    for (let i = 0; i < 3; i++) {
      store.getState().submitMove('rock');
      expect(store.getState().lastOutcome!.aiMode).toBe('random');
      store.getState().continue();
    }

    // Round 4: Fair's adaptive threshold.
    store.getState().submitMove('rock');
    expect(store.getState().lastOutcome!.aiMode).toBe('adaptive');
  });

  it('undoRound discards the last round and returns to the same round number for a redo', () => {
    const store = createMatchStore(() => 0);
    store.getState().setDifficulty('fair');
    store.getState().startMatch();
    store.getState().submitMove('rock');
    store.getState().undoRound();
    const state = store.getState();
    expect(state.screen).toBe('round');
    expect(state.round).toBe(1);
    expect(state.history).toEqual([]);
    expect(state.outcomes).toEqual([]);
  });

  it('continue advances to the next round until the match is over, then writes a leaderboard entry matching the real outcome history', () => {
    const store = createMatchStore(() => 0);
    store.getState().setDifficulty('fair');
    store.getState().startMatch();

    let rounds = 0;
    while (store.getState().screen !== 'result') {
      store.getState().submitMove('scissors');
      store.getState().continue();
      rounds++;
      if (rounds > 10) throw new Error('match did not conclude');
    }

    expect(store.getState().screen).toBe('result');
    const finalOutcomes = store.getState().outcomes;
    const entries = loadLeaderboard();
    expect(entries).toHaveLength(1);
    // The leaderboard entry must be computed from the real match history, not guessed.
    expect(entries[0].result).toBe(matchResult(finalOutcomes));
    expect(entries[0].bestStreak).toBe(bestPlayerStreak(finalOutcomes));
  });

  it('flags a new best streak only when it genuinely beats what is already on today\'s leaderboard', () => {
    function playMatchWithPaper() {
      let guard = 0;
      while (store.getState().screen !== 'result') {
        if (store.getState().screen === 'round') {
          store.getState().submitMove('paper');
          store.getState().continue();
        }
        guard++;
        if (guard > 10) throw new Error('match did not conclude');
      }
    }

    const store = createMatchStore(() => 0);
    store.getState().setDifficulty('fair');
    store.getState().startMatch();
    playMatchWithPaper();
    // First entry of the day: any real streak beats the (empty) prior best.
    expect(store.getState().isNewBestStreak).toBe(true);
    const firstStreak = store.getState().outcomes.length > 0 ? loadLeaderboard()[0].bestStreak : 0;
    expect(firstStreak).toBeGreaterThan(0);

    // Identical rematch reproduces the same streak — tying the existing best is not "new".
    store.getState().rematch();
    playMatchWithPaper();
    expect(store.getState().isNewBestStreak).toBe(false);
  });

  it('rematch resets history so the AI model starts blind again', () => {
    const store = createMatchStore(() => 0);
    store.getState().setDifficulty('fair');
    store.getState().startMatch();
    store.getState().submitMove('rock');
    store.getState().continue();
    store.getState().rematch();
    const state = store.getState();
    expect(state.screen).toBe('round');
    expect(state.round).toBe(1);
    expect(state.history).toEqual([]);
    expect(state.outcomes).toEqual([]);
  });

  it('returnToAttract resets the full state', () => {
    const store = createMatchStore();
    store.getState().setDifficulty('ruthless');
    store.getState().startMatch();
    store.getState().returnToAttract();
    const state = store.getState();
    expect(state.screen).toBe('attract');
    expect(state.difficulty).toBeNull();
  });

  it('supports 2-player multiplayer duel mode and tracks round outcomes', () => {
    const store = createMatchStore();
    store.getState().setGameMode('multiplayer');
    store.getState().setMatchLength(3); // Best of 3 -> First to 2
    store.getState().startMatch();

    expect(store.getState().screen).toBe('multiplayer');
    expect(store.getState().p1Score).toBe(0);
    expect(store.getState().p2Score).toBe(0);

    // Round 1: P1 Rock, P2 Scissors -> P1 wins
    store.getState().recordMultiplayerRound('rock', 'scissors');
    expect(store.getState().p1Score).toBe(1);
    expect(store.getState().p2Score).toBe(0);
    expect(store.getState().screen).toBe('multiplayer');

    // Round 2: P1 Paper, P2 Rock -> P1 wins again (reaches 2 wins) -> multiplayer-result
    store.getState().recordMultiplayerRound('paper', 'rock');
    expect(store.getState().p1Score).toBe(2);
    expect(store.getState().screen).toBe('multiplayer-result');
  });
});
