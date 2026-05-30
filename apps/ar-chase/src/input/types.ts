export interface InputFrame {
  yaw: number;
  pitch: number;
  forwardHeld: boolean;
  stepCount: number;
  joystick: {
    x: number;
    y: number;
  };
  source: 'motion' | 'joystick' | 'keyboard' | 'forward' | 'mixed' | 'none';
}
