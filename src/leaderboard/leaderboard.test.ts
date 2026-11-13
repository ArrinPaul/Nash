import { describe, it, expect } from 'vitest';
import { withEntry, topEntries, todaysEntries, type LeaderboardEntry } from './leaderboard';

function entry(name: string, bestStreak: number, timestamp: number): LeaderboardEntry {
  return { name, difficulty: 'fair', bestStreak, result: 'player', timestamp };
}

describe('withEntry', () => {
  it('sorts by best streak descending', () => {
    const entries = withEntry([entry('A', 2, 1), entry('B', 5, 2)], entry('C', 3, 3));
    expect(entries.map((e) => e.name)).toEqual(['B', 'C', 'A']);
  });

  it('caps the list at the max size', () => {
    const many = Array.from({ length: 60 }, (_, i) => entry(`P${i}`, i, i));
    const result = withEntry(many, entry('new', 1000, 9999));
    expect(result.length).toBe(50);
    expect(result[0].name).toBe('new');
  });
});

describe('topEntries', () => {
  it('returns the first n entries', () => {
    const entries = [entry('A', 3, 1), entry('B', 2, 2), entry('C', 1, 3)];
    expect(topEntries(entries, 2).map((e) => e.name)).toEqual(['A', 'B']);
  });
});

describe('todaysEntries', () => {
  it('keeps only entries from the same calendar day as `now`', () => {
    const now = new Date(2026, 10, 13, 15, 0, 0).getTime();
    const sameDay = new Date(2026, 10, 13, 9, 0, 0).getTime();
    const yesterday = new Date(2026, 10, 12, 23, 0, 0).getTime();
    const entries = [entry('today', 3, sameDay), entry('yesterday', 9, yesterday)];
    expect(todaysEntries(entries, now).map((e) => e.name)).toEqual(['today']);
  });
});
