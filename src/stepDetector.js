import { CONFIG } from "./config.js";

export class StepDetector {
  constructor() {
    this.reset();
  }

  reset() {
    this.lastPeakTime = 0;
    this.stepTimes = [];
    this.totalSteps = 0;
    this.cadence = 0;
    this.currentSpeed = 0;
    this.lastMagnitude = 0;
    this.wasAboveThreshold = false;
  }

  handleMotion(event, now = performance.now()) {
    const acceleration = event.accelerationIncludingGravity || event.acceleration;
    if (!acceleration) {
      return this.getState(now);
    }

    const x = acceleration.x || 0;
    const y = acceleration.y || 0;
    const z = acceleration.z || 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    this.lastMagnitude = magnitude;

    const aboveThreshold = magnitude > CONFIG.STEP_THRESHOLD;
    const interval = now - this.lastPeakTime;
    const crossedUp = aboveThreshold && !this.wasAboveThreshold;

    if (crossedUp && interval >= CONFIG.MIN_STEP_INTERVAL) {
      if (interval > CONFIG.MAX_STEP_INTERVAL) {
        this.stepTimes = [];
      }
      this.registerStep(now);
    }

    this.wasAboveThreshold = aboveThreshold;
    return this.getState(now);
  }

  registerStep(now) {
    this.lastPeakTime = now;
    this.stepTimes.push(now);
    this.totalSteps += 1;

    if (this.stepTimes.length > CONFIG.STEP_HISTORY_SIZE) {
      this.stepTimes.shift();
    }

    if (this.stepTimes.length >= 2) {
      const intervals = [];
      for (let index = 1; index < this.stepTimes.length; index += 1) {
        intervals.push(this.stepTimes[index] - this.stepTimes[index - 1]);
      }
      const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
      this.cadence = 60000 / averageInterval;
      this.currentSpeed = this.mapCadenceToSpeed(this.cadence);
    } else {
      this.cadence = CONFIG.MIN_CADENCE;
      this.currentSpeed = CONFIG.PLAYER_MIN_SPEED;
    }
  }

  mapCadenceToSpeed(cadence) {
    if (cadence < CONFIG.MIN_CADENCE) {
      return 0;
    }

    const normalized = (cadence - CONFIG.MIN_CADENCE) / (CONFIG.MAX_CADENCE - CONFIG.MIN_CADENCE);
    const clamped = Math.max(0, Math.min(1, normalized));
    return CONFIG.PLAYER_MIN_SPEED + clamped * (CONFIG.PLAYER_MAX_SPEED - CONFIG.PLAYER_MIN_SPEED);
  }

  getState(now = performance.now()) {
    if (this.lastPeakTime && now - this.lastPeakTime > CONFIG.IDLE_TIMEOUT) {
      this.currentSpeed *= CONFIG.SPEED_DECAY_RATE;
      this.cadence *= CONFIG.SPEED_DECAY_RATE;

      if (this.currentSpeed < 0.1) {
        this.currentSpeed = 0;
        this.cadence = 0;
      }
    }

    return {
      cadence: this.cadence,
      speed: this.currentSpeed,
      totalSteps: this.totalSteps,
      lastMagnitude: this.lastMagnitude,
    };
  }
}
