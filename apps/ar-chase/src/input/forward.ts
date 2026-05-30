export class ForwardInput {
  private held = false;
  private keyboardHeld = false;

  constructor(private readonly button: HTMLButtonElement) {
    this.button.addEventListener('pointerdown', this.handlePointerDown);
    this.button.addEventListener('pointerup', this.clearHeld);
    this.button.addEventListener('pointercancel', this.clearHeld);
    this.button.addEventListener('lostpointercapture', this.clearHeld);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.clearHeld);
  }

  snapshot(): { held: boolean; keyboard: boolean } {
    return { held: this.held || this.keyboardHeld, keyboard: this.keyboardHeld };
  }

  destroy(): void {
    this.button.removeEventListener('pointerdown', this.handlePointerDown);
    this.button.removeEventListener('pointerup', this.clearHeld);
    this.button.removeEventListener('pointercancel', this.clearHeld);
    this.button.removeEventListener('lostpointercapture', this.clearHeld);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clearHeld);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.held = true;
    this.button.setPointerCapture(event.pointerId);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyW' || event.code === 'ArrowUp') {
      this.keyboardHeld = true;
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'KeyW' || event.code === 'ArrowUp') {
      this.keyboardHeld = false;
    }
  };

  private readonly clearHeld = (): void => {
    this.held = false;
    this.keyboardHeld = false;
  };
}
