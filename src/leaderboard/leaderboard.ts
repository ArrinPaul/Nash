import type { MatchDifficulty } from '../data/types';

export interface LeaderboardEntry {
  name: string;
  difficulty: MatchDifficulty;
  bestStreak: number;
  result: 'player' | 'ai' | 'draw';
  timestamp: number;
}

const STORAGE_KEY = 'rps-vs-ai:leaderboard';
const MAX_ENTRIES = 50;

/** Pure: inserts an entry, re-sorts by best streak (desc), and caps the list. */
export function withEntry(entries: LeaderboardEntry[], entry: LeaderboardEntry): LeaderboardEntry[] {
  return [...entries, entry].sort((a, b) => b.bestStreak - a.bestStreak).slice(0, MAX_ENTRIES);
}

export function topEntries(entries: LeaderboardEntry[], n: number): LeaderboardEntry[] {
  return entries.slice(0, n);
}

/** Pure: entries whose timestamp falls on the same calendar day as `now` (local time) —
 * "best win-streak today" per PLAN.md, not an all-time leaderboard. */
export function todaysEntries(entries: LeaderboardEntry[], now: number = Date.now()): LeaderboardEntry[] {
  const today = new Date(now);
  return entries.filter((e) => {
    const d = new Date(e.timestamp);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const next = withEntry(loadLeaderboard(), entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local storage may be unavailable (private browsing, quota); the match still
    // works, it just won't persist to the leaderboard.
  }
  return next;
}
