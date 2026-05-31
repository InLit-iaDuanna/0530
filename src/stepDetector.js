const STEP_THRESHOLD = 12.0;
const MIN_STEP_INTERVAL = 200;
const MAX_STEP_INTERVAL = 800;
const STEP_HISTORY_SIZE = 5;
const IDLE_TIMEOUT = 850;
const SPEED_DECAY_RATE = 0.72;
const MIN_CADENCE = 60;
const MAX_CADENCE = 180;
const PLAYER_MIN_SPEED = 1.0;
const PLAYER_MAX_SPEED = 5.2;

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
    if (!acceleration) return this.getState(now);

    const x = acceleration.x || 0;
    const y = acceleration.y || 0;
    const z = acceleration.z || 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    this.lastMagnitude = magnitude;

    const aboveThreshold = magnitude > STEP_THRESHOLD;
    const interval = now - this.lastPeakTime;
    const crossedUp = aboveThreshold && !this.wasAboveThreshold;

    if (crossedUp && interval >= MIN_STEP_INTERVAL) {
      if (interval > MAX_STEP_INTERVAL) this.stepTimes = [];
      this.registerStep(now);
    }

    this.wasAboveThreshold = aboveThreshold;
    return this.getState(now);
  }

  registerStep(now) {
    this.lastPeakTime = now;
    this.stepTimes.push(now);
    this.totalSteps += 1;

    if (this.stepTimes.length > STEP_HISTORY_SIZE) this.stepTimes.shift();

    if (this.stepTimes.length >= 2) {
      const intervals = [];
      for (let index = 1; index < this.stepTimes.length; index += 1) {
        intervals.push(this.stepTimes[index] - this.stepTimes[index - 1]);
      }
      const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
      this.cadence = 60000 / averageInterval;
      this.currentSpeed = this.mapCadenceToSpeed(this.cadence);
    } else {
      this.cadence = MIN_CADENCE;
      this.currentSpeed = PLAYER_MIN_SPEED;
    }
  }

  mapCadenceToSpeed(cadence) {
    if (cadence < MIN_CADENCE) return 0;
    const normalized = (cadence - MIN_CADENCE) / (MAX_CADENCE - MIN_CADENCE);
    const clamped = Math.max(0, Math.min(1, normalized));
    return PLAYER_MIN_SPEED + clamped * (PLAYER_MAX_SPEED - PLAYER_MIN_SPEED);
  }

  getState(now = performance.now()) {
    if (this.lastPeakTime && now - this.lastPeakTime > IDLE_TIMEOUT) {
      this.currentSpeed *= SPEED_DECAY_RATE;
      this.cadence *= SPEED_DECAY_RATE;
      if (this.currentSpeed < 0.1) {
        this.currentSpeed = 0;
        this.cadence = 0;
      }
    }

    return {
      cadence: this.cadence,
      speed: this.currentSpeed,
      totalSteps: this.totalSteps,
      lastMagnitude: this.lastMagnitude
    };
  }
}
