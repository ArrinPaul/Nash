import { create, type UseBoundStore, type StoreApi } from 'zustand';
import type { Move, MatchDifficulty, RoundOutcome } from '../data/types';
import { pickAIMove } from '../game/ai';
import { resolveRound, isMatchOver, matchResult, bestPlayerStreak } from '../game/match';
import { addEntry, loadLeaderboard, bestStreakToday } from '../leaderboard/leaderboard';

export type Screen = 'attract' | 'setup' | 'round' | 'reveal' | 'result' | 'explainer';

export interface MatchState {
  screen: Screen;
  playerName: string;
  difficulty: MatchDifficulty | null;
  round: number;
  history: Move[];
  outcomes: RoundOutcome[];
  lastOutcome: RoundOutcome | null;
  /** True only when this match's best streak just beat every streak already on today's
   * leaderboard — drives a bigger celebratory beat on the result screen than an ordinary
   * match win gets. Computed once, at the moment the match ends, from real leaderboard data. */
  isNewBestStreak: boolean;

  setPlayerName: (name: string) => void;
  goToSetup: () => void;
  setDifficulty: (d: MatchDifficulty) => void;
  startMatch: () => void;
  submitMove: (move: Move) => void;
  undoRound: () => void;
  continue: () => void;
  showExplainer: () => void;
  backFromExplainer: () => void;
  rematch: () => void;
  returnToAttract: () => void;
}

const INITIAL = {
  screen: 'attract' as Screen,
  playerName: '',
  difficulty: null as MatchDifficulty | null,
  round: 1,
  history: [] as Move[],
  outcomes: [] as RoundOutcome[],
  lastOutcome: null as RoundOutcome | null,
  isNewBestStreak: false,
};

export function createMatchStore(rng: () => number = Math.random): UseBoundStore<StoreApi<MatchState>> {
  return create<MatchState>((set, get) => ({
    ...INITIAL,

    setPlayerName: (name: string) => set({ playerName: name }),

    goToSetup: () => set({ screen: 'setup' }),

    setDifficulty: (d: MatchDifficulty) => set({ difficulty: d }),

    startMatch: () => {
      const state = get();
      if (!state.difficulty) return;
      set({
        screen: 'round',
        round: 1,
        history: [],
        outcomes: [],
        lastOutcome: null,
        isNewBestStreak: false,
      });
    },

    submitMove: (move: Move) => {
      const state = get();
      // Guard: screen flips away from 'round' immediately, so a rapid double-tap on a
      // move button only ever registers the first pick (same pattern as real-or-ai-wall's
      // guess() guard against double-click double-scoring).
      if (state.screen !== 'round' || !state.difficulty) return;

      const aiPick = pickAIMove({ history: state.history, round: state.round, difficulty: state.difficulty, rng });
      const winner = resolveRound(move, aiPick.move);
      const outcome: RoundOutcome = {
        round: state.round,
        playerMove: move,
        aiMove: aiPick.move,
        winner,
        aiMode: aiPick.mode,
        predictedPlayerMove: aiPick.predictedPlayerMove,
      };

      set({
        history: [...state.history, move],
        outcomes: [...state.outcomes, outcome],
        lastOutcome: outcome,
        screen: 'reveal',
      });
    },

    // Discards the round just played and returns to the round screen so the player can
    // re-pick — the hook point for a future gesture-misdetection replay (PLAN.md risk #4):
    // today it's a plain "redo this pick" affordance since there's no camera yet to
    // misread, but it's wired the same way that fix would use.
    undoRound: () => {
      const state = get();
      if (state.screen !== 'reveal' || !state.lastOutcome) return;
      set({
        history: state.history.slice(0, -1),
        outcomes: state.outcomes.slice(0, -1),
        lastOutcome: null,
        screen: 'round',
      });
    },

    continue: () => {
      const state = get();
      if (state.screen !== 'reveal' || !state.difficulty) return;

      if (isMatchOver(state.outcomes)) {
        const streak = bestPlayerStreak(state.outcomes);
        const result = matchResult(state.outcomes);
        // Read today's best BEFORE writing this match's entry — a tie with the existing
        // best doesn't count as a new one, only strictly beating it does.
        const priorBest = bestStreakToday(loadLeaderboard());
        const isNewBestStreak = streak > 0 && streak > priorBest;
        addEntry({
          name: state.playerName.trim() || 'Anonymous',
          difficulty: state.difficulty,
          bestStreak: streak,
          result,
          timestamp: Date.now(),
        });
        set({ screen: 'result', isNewBestStreak });
        return;
      }

      set({ round: state.round + 1, screen: 'round' });
    },

    showExplainer: () => set({ screen: 'explainer' }),

    backFromExplainer: () => set({ screen: 'result' }),

    // Fresh match, same difficulty: the AI's model resets per match by design (PLAN.md
    // "no persistent cross-session player profiling") — a new `history`/`outcomes` array
    // means round 1 of the rematch is exactly as blind as round 1 of the first match.
    rematch: () => {
      set({
        screen: 'round',
        round: 1,
        history: [],
        outcomes: [],
        lastOutcome: null,
        isNewBestStreak: false,
      });
    },

    returnToAttract: () => {
      set({ ...INITIAL });
    },
  }));
}

export const useMatchStore = createMatchStore();
