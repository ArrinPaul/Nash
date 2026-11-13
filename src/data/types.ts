export type Move = 'rock' | 'paper' | 'scissors';

export const MOVES: Move[] = ['rock', 'paper', 'scissors'];

export type RoundWinner = 'player' | 'ai' | 'tie';

/** "Fair" adapts later and weights its counter-pick more loosely; "Ruthless" adapts
 * almost immediately and commits to its counter-pick harder. Both differ in the
 * actual mechanics (see game/ai.ts), never just in on-screen label. */
export type MatchDifficulty = 'fair' | 'ruthless';

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
