export interface InputFrame {
  yaw: number;
  pitch: number;
  stepCount: number;
  joystick: {
    x: number;
    y: number;
  };
  source: 'motion' | 'joystick' | 'keyboard' | 'mixed' | 'none';
}
