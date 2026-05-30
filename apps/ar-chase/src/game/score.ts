const BEST_SCORE_KEY = 'ar-chase-best-score-ms';

export class ScoreTracker {
  private startedAt = 0;
  private elapsedMs = 0;

  start(now = performance.now()): void {
    this.startedAt = now;
    this.elapsedMs = 0;
  }

  update(now = performance.now()): number {
    this.elapsedMs = Math.max(0, now - this.startedAt);
    return this.elapsedMs;
  }

  get elapsed(): number {
    return this.elapsedMs;
  }

  commitBest(storage: Storage = localStorage): number {
    const previous = readBestScore(storage);
    const best = Math.max(previous, this.elapsedMs);
    storage.setItem(BEST_SCORE_KEY, String(Math.round(best)));
    return best;
  }
}

export function readBestScore(storage: Storage = localStorage): number {
  const raw = storage.getItem(BEST_SCORE_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

export function formatScore(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
