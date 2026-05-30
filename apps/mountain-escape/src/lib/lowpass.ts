export class LowPass {
  private current = 0;
  private ready = false;

  constructor(private readonly alpha = 0.15) {}

  reset(value = 0): void {
    this.current = value;
    this.ready = true;
  }

  update(value: number): number {
    if (!this.ready) {
      this.reset(value);
      return value;
    }

    this.current += this.alpha * angleDelta(value, this.current);
    return this.current;
  }
}

export function angleDelta(next: number, current: number): number {
  return Math.atan2(Math.sin(next - current), Math.cos(next - current));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
