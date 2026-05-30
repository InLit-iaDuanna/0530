export class KeyboardInput {
  private readonly keys = new Set<string>();
  private stepTimer = 0;
  private pendingSteps = 0;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.clear);
  }

  update(dt: number): void {
    const moving = this.isDown('KeyW') || this.isDown('ArrowUp');
    if (!moving) {
      this.stepTimer = 0;
      return;
    }

    this.stepTimer += dt;
    const interval = this.isRunning() ? 0.22 : 0.35;
    while (this.stepTimer >= interval) {
      this.stepTimer -= interval;
      this.pendingSteps += 1;
    }
  }

  consumeSteps(): number {
    const steps = this.pendingSteps;
    this.pendingSteps = 0;
    return steps;
  }

  forwardAxis(): number {
    return this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0;
  }

  lateralAxis(): number {
    const left = this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0;
    const right = this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0;
    return right - left;
  }

  isRunning(): boolean {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clear);
  }

  private isDown(code: string): boolean {
    return this.keys.has(code);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly clear = (): void => {
    this.keys.clear();
  };
}
