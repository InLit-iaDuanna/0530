export class SensorManager {
  constructor() {
    this.orientation = null;
    this.motion = null;
    this.calibrationYaw = 0;
    this.calibrationPitch = 0;
    this.calibrationRoll = 0;
    this.manualYawOffset = readStoredNumber("ghost-demo-manual-yaw", 0);
    this.manualPitchOffset = readStoredNumber("ghost-demo-manual-pitch", 0);
    this.hasOrientation = false;
    this.hasMotion = false;
    this.permissionState = "unknown";
    this.orientationHandler = this.handleOrientation.bind(this);
    this.motionHandler = this.handleMotion.bind(this);
    this.motionListeners = new Set();
  }

  getCapabilities() {
    const secure = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    return {
      secure,
      orientation: "DeviceOrientationEvent" in window,
      motion: "DeviceMotionEvent" in window,
      orientationPermission:
        "DeviceOrientationEvent" in window &&
        typeof DeviceOrientationEvent.requestPermission === "function",
      motionPermission:
        "DeviceMotionEvent" in window &&
        typeof DeviceMotionEvent.requestPermission === "function",
      vibration: "vibrate" in navigator,
    };
  }

  async requestPermissions() {
    const capabilities = this.getCapabilities();
    if (!capabilities.secure) {
      throw new Error("HTTPS is required for stable phone sensor access. Open the LAN HTTPS URL.");
    }

    const requests = [];
    if (capabilities.orientationPermission) {
      requests.push(DeviceOrientationEvent.requestPermission());
    }
    if (capabilities.motionPermission) {
      requests.push(DeviceMotionEvent.requestPermission());
    }

    const results = await Promise.all(requests);
    if (results.some((result) => result !== "granted")) {
      this.permissionState = "denied";
      throw new Error("Sensor permission was denied. Allow motion and orientation access in the browser.");
    }

    this.permissionState = "granted";
    return capabilities;
  }

  start() {
    window.addEventListener("deviceorientation", this.orientationHandler, true);
    window.addEventListener("devicemotion", this.motionHandler, true);
  }

  stop() {
    window.removeEventListener("deviceorientation", this.orientationHandler, true);
    window.removeEventListener("devicemotion", this.motionHandler, true);
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
      relativeYaw: normalizeDegrees(yaw - this.calibrationYaw),
    };
    this.hasOrientation = true;
  }

  handleMotion(event) {
    this.motion = event;
    this.hasMotion = true;
    for (const listener of this.motionListeners) {
      listener(event);
    }
  }

  calibrate() {
    this.calibrationYaw = this.orientation ? this.orientation.yaw : 0;
    this.calibrationPitch = this.orientation ? this.orientation.pitch : 0;
    this.calibrationRoll = this.orientation ? this.orientation.roll : 0;
  }

  adjustManualOffset(axis, amount) {
    if (axis === "yaw") {
      this.manualYawOffset = normalizeDegrees(this.manualYawOffset + amount);
    } else if (axis === "pitch") {
      this.manualPitchOffset = clamp(this.manualPitchOffset + amount, -30, 30);
    }

    this.saveManualOffsets();
    return this.getManualOffsets();
  }

  resetManualOffsets() {
    this.manualYawOffset = 0;
    this.manualPitchOffset = 0;
    this.saveManualOffsets();
    return this.getManualOffsets();
  }

  getManualOffsets() {
    return {
      yaw: this.manualYawOffset,
      pitch: this.manualPitchOffset,
    };
  }

  saveManualOffsets() {
    localStorage.setItem("ghost-demo-manual-yaw", String(this.manualYawOffset));
    localStorage.setItem("ghost-demo-manual-pitch", String(this.manualPitchOffset));
  }

  getRelativeOrientation() {
    if (!this.orientation) {
      return { yaw: 0, pitch: 0, roll: 0, available: false };
    }

    return {
      yaw: normalizeDegrees(this.orientation.yaw - this.calibrationYaw + this.manualYawOffset),
      pitch: clamp(this.orientation.pitch - this.calibrationPitch + this.manualPitchOffset, -45, 45),
      roll: clamp(this.orientation.roll - this.calibrationRoll, -45, 45),
      available: true,
    };
  }

  getDebugState() {
    return {
      orientation: this.orientation,
      manualOffsets: this.getManualOffsets(),
      hasOrientation: this.hasOrientation,
      hasMotion: this.hasMotion,
      permissionState: this.permissionState,
    };
  }
}

function normalizeDegrees(value) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readStoredNumber(key, fallback) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}
