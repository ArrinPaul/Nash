export type Move = 'rock' | 'paper' | 'scissors';

export const MOVES: Move[] = ['rock', 'paper', 'scissors'];

export type RoundWinner = 'player' | 'ai' | 'tie';

export type GameMode = 'vs-ai' | 'multiplayer' | 'survival';

export type MatchLength = 3 | 7 | 11;

export type AIArchetype = 'nash' | 'psychologist' | 'ruthless';

/** "Fair" adapts later and weights its counter-pick more loosely; "Ruthless" adapts
 * almost immediately and commits to its counter-pick harder. Both differ in the
 * actual mechanics (see game/ai.ts), never just in on-screen label. */
export type MatchDifficulty = 'fair' | 'ruthless';

export interface Player2State {
  player1Name: string;
  player2Name: string;
  player1Move: Move | null;
  player2Move: Move | null;
  player1Wins: number;
  player2Wins: number;
}

export interface SurvivalState {
  lives: number;
  maxLives: number;
  currentStreak: number;
  bestStreak: number;
}

export interface RoundOutcome {
  round: number;
  playerMove: Move;
  aiMove: Move;
  winner: RoundWinner;
  /** Whether the AI's pick this round came from the random warm-up or the frequency model. */
  aiMode: 'random' | 'adaptive';
  /** The player move the frequency model predicted, when aiMode is 'adaptive'. */
  predictedPlayerMove: Move | null;
}
