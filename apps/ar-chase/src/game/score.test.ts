import { describe, expect, it } from 'vitest';
import { formatScore, readBestScore, ScoreTracker } from './score';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  readonly length = 0;

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(): string | null {
    return null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('ScoreTracker', () => {
  it('formats mm:ss scores', () => {
    expect(formatScore(0)).toBe('00:00');
    expect(formatScore(65_200)).toBe('01:05');
  });

  it('stores the best score only when higher', () => {
    const storage = new MemoryStorage();
    const tracker = new ScoreTracker();

    tracker.start(1000);
    tracker.update(5000);
    expect(tracker.commitBest(storage)).toBe(4000);

    tracker.start(1000);
    tracker.update(2500);
    expect(tracker.commitBest(storage)).toBe(4000);
    expect(readBestScore(storage)).toBe(4000);
  });
});
