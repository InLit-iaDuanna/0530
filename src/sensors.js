export class SensorManager {
  constructor() {
    this.orientation = null;
    this.motion = null;
    this.calibrationYaw = 0;
    this.calibrationPitch = 0;
    this.calibrationRoll = 0;
    this.hasOrientation = false;
    this.hasMotion = false;
    this.permissionState = 'unknown';
    this.motionListeners = new Set();
    this.orientationHandler = this.handleOrientation.bind(this);
    this.motionHandler = this.handleMotion.bind(this);
  }

  getCapabilities() {
    const secure =
      window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    return {
      secure,
      orientation: 'DeviceOrientationEvent' in window,
      motion: 'DeviceMotionEvent' in window,
      orientationPermission:
        'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission === 'function',
      motionPermission: 'DeviceMotionEvent' in window && typeof DeviceMotionEvent.requestPermission === 'function'
    };
  }

  async requestPermissions() {
    const capabilities = this.getCapabilities();
    if (!capabilities.secure) {
      throw new Error('手机传感器需要 HTTPS，请使用 https 内网地址进入游戏。');
    }
    if (!capabilities.orientation || !capabilities.motion) {
      throw new Error('当前浏览器不支持方向或运动传感器，请换用 Safari 或 Chrome。');
    }

    const requests = [];
    if (capabilities.orientationPermission) requests.push(DeviceOrientationEvent.requestPermission());
    if (capabilities.motionPermission) requests.push(DeviceMotionEvent.requestPermission());

    const results = await Promise.all(requests);
    if (results.some((result) => result !== 'granted')) {
      this.permissionState = 'denied';
      throw new Error('没有获得运动/方向权限，无法使用踏步控制。');
    }

    this.permissionState = 'granted';
    return capabilities;
  }

  start() {
    window.addEventListener('deviceorientation', this.orientationHandler, true);
    window.addEventListener('devicemotion', this.motionHandler, true);
  }

  stop() {
    window.removeEventListener('deviceorientation', this.orientationHandler, true);
    window.removeEventListener('devicemotion', this.motionHandler, true);
  }

  onMotion(listener) {
    this.motionListeners.add(listener);
    return () => this.motionListeners.delete(listener);
  }

  handleOrientation(event) {
    const yaw = Number.isFinite(event.alpha) ? event.alpha : 0;
    const pitch = Number.isFinite(event.beta) ? event.beta : 0;
    const roll = Number.isFinite(event.gamma) ? event.gamma : 0;
    this.orientation = {
      yaw,
      pitch,
      roll,
      absolute: event.absolute,
      relativeYaw: normalizeDegrees(yaw - this.calibrationYaw)
    };
    this.hasOrientation = true;
  }

  handleMotion(event) {
    this.motion = event;
    this.hasMotion = true;
    for (const listener of this.motionListeners) listener(event);
  }

  calibrate() {
    this.calibrationYaw = this.orientation ? this.orientation.yaw : 0;
    this.calibrationPitch = this.orientation ? this.orientation.pitch : 0;
    this.calibrationRoll = this.orientation ? this.orientation.roll : 0;
  }

  getRelativeOrientation() {
    if (!this.orientation) {
      return { yaw: 0, pitch: 0, roll: 0, available: false };
    }

    return {
      yaw: normalizeDegrees(this.orientation.yaw - this.calibrationYaw),
      pitch: clamp(this.orientation.pitch - this.calibrationPitch, -45, 45),
      roll: clamp(this.orientation.roll - this.calibrationRoll, -45, 45),
      available: true
    };
  }

  getDebugState() {
    return {
      hasOrientation: this.hasOrientation,
      hasMotion: this.hasMotion,
      permissionState: this.permissionState,
      orientation: this.orientation
    };
  }
}

function normalizeDegrees(value) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
