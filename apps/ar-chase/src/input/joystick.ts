import { clamp } from '../lib/lowpass';

export class JoystickInput {
  private pointerId: number | null = null;
  private origin = { x: 0, y: 0 };
  private value = { x: 0, y: 0 };
  private keyboard = { x: 0, y: 0 };
  private draggingLook = false;
  private lastLookX = 0;
  private lookDelta = { yaw: 0, pitch: 0 };

  constructor(private readonly root: HTMLElement, private readonly pad: HTMLElement) {
    this.pad.addEventListener('pointerdown', this.handlePadDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    root.addEventListener('pointerdown', this.handleLookDown);
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle('show-controls', visible);
  }

  snapshot(): { x: number; y: number; lookYaw: number; lookPitch: number; active: boolean } {
    const x = clamp(this.value.x + this.keyboard.x, -1, 1);
    const y = clamp(this.value.y + this.keyboard.y, -1, 1);
    const lookYaw = this.lookDelta.yaw;
    const lookPitch = this.lookDelta.pitch;
    this.lookDelta = { yaw: 0, pitch: 0 };

    return {
      x,
      y,
      lookYaw,
      lookPitch,
      active: Math.abs(x) > 0.05 || Math.abs(y) > 0.05 || Math.abs(lookYaw) > 0,
    };
  }

  destroy(): void {
    this.pad.removeEventListener('pointerdown', this.handlePadDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.root.removeEventListener('pointerdown', this.handleLookDown);
  }

  private readonly handlePadDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.origin = { x: event.clientX, y: event.clientY };
    this.pad.setPointerCapture(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.pointerId === event.pointerId) {
      const dx = event.clientX - this.origin.x;
      const dy = event.clientY - this.origin.y;
      this.value = {
        x: clamp(dx / 48, -1, 1),
        y: clamp(-dy / 48, -1, 1),
      };
      this.pad.style.setProperty('--stick-x', `${this.value.x * 28}px`);
      this.pad.style.setProperty('--stick-y', `${-this.value.y * 28}px`);
      return;
    }

    if (this.draggingLook) {
      this.lookDelta.yaw += (event.clientX - this.lastLookX) * -0.006;
      this.lastLookX = event.clientX;
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.pointerId === event.pointerId) {
      this.pointerId = null;
      this.value = { x: 0, y: 0 };
      this.pad.style.setProperty('--stick-x', '0px');
      this.pad.style.setProperty('--stick-y', '0px');
    }

    this.draggingLook = false;
  };

  private readonly handleLookDown = (event: PointerEvent): void => {
    if (event.target === this.pad || this.pad.contains(event.target as Node)) {
      return;
    }

    if (event.clientX > window.innerWidth * 0.45) {
      this.draggingLook = true;
      this.lastLookX = event.clientX;
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.setKey(event.code, true);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.setKey(event.code, false);
  };

  private setKey(code: string, down: boolean): void {
    const value = down ? 1 : 0;
    if (code === 'KeyW' || code === 'ArrowUp') this.keyboard.y = value;
    if (code === 'KeyS' || code === 'ArrowDown') this.keyboard.y = -value;
    if (code === 'KeyA' || code === 'ArrowLeft') this.keyboard.x = -value;
    if (code === 'KeyD' || code === 'ArrowRight') this.keyboard.x = value;
  }
}
