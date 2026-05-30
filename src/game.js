import { CONFIG, GAME_STATES, ALERT_LEVELS } from "./config.js";
import { SensorManager } from "./sensors.js";
import { StepDetector } from "./stepDetector.js";
import { GhostRenderer } from "./renderer.js";
import { AudioManager } from "./audio.js";
import { HapticsManager } from "./haptics.js";

const elements = {
  canvas: document.querySelector("#scene"),
  alertOverlay: document.querySelector("#alertOverlay"),
  startScreen: document.querySelector("#startScreen"),
  calibrationScreen: document.querySelector("#calibrationScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  pauseScreen: document.querySelector("#pauseScreen"),
  endScreen: document.querySelector("#endScreen"),
  capabilityList: document.querySelector("#capabilityList"),
  calibrationHelp: document.querySelector("#calibrationHelp"),
  forwardStep: document.querySelector("#forwardStep"),
  manualStep: document.querySelector("#manualStep"),
  countdown: document.querySelector("#countdown"),
  startButton: document.querySelector("#startButton"),
  desktopButton: document.querySelector("#desktopButton"),
  confirmForwardButton: document.querySelector("#confirmForwardButton"),
  skipCalibrationButton: document.querySelector("#skipCalibrationButton"),
  manualUpButton: document.querySelector("#manualUpButton"),
  manualDownButton: document.querySelector("#manualDownButton"),
  manualLeftButton: document.querySelector("#manualLeftButton"),
  manualRightButton: document.querySelector("#manualRightButton"),
  manualResetButton: document.querySelector("#manualResetButton"),
  manualYawValue: document.querySelector("#manualYawValue"),
  manualPitchValue: document.querySelector("#manualPitchValue"),
  pauseButton: document.querySelector("#pauseButton"),
  recalibrateButton: document.querySelector("#recalibrateButton"),
  resumeButton: document.querySelector("#resumeButton"),
  pauseRecalibrateButton: document.querySelector("#pauseRecalibrateButton"),
  muteButton: document.querySelector("#muteButton"),
  vibrationButton: document.querySelector("#vibrationButton"),
  quitButton: document.querySelector("#quitButton"),
  restartButton: document.querySelector("#restartButton"),
  homeButton: document.querySelector("#homeButton"),
  messageToast: document.querySelector("#messageToast"),
  distanceValue: document.querySelector("#distanceValue"),
  speedValue: document.querySelector("#speedValue"),
  cadenceValue: document.querySelector("#cadenceValue"),
  timerValue: document.querySelector("#timerValue"),
  resultEyebrow: document.querySelector("#resultEyebrow"),
  resultTitle: document.querySelector("#resultTitle"),
  survivalValue: document.querySelector("#survivalValue"),
  stepsValue: document.querySelector("#stepsValue"),
  averageSpeedValue: document.querySelector("#averageSpeedValue"),
  closestValue: document.querySelector("#closestValue"),
  debugPanel: document.querySelector("#debugPanel"),
};

class GhostGame {
  constructor() {
    this.renderer = new GhostRenderer(elements.canvas);
    this.sensors = new SensorManager();
    this.stepDetector = new StepDetector();
    this.audio = new AudioManager();
    this.haptics = new HapticsManager();
    this.desktopMode = false;
    this.state = GAME_STATES.START;
    this.lastFrameTime = performance.now();
    this.unsubscribeMotion = null;
    this.keyboardCadence = 0;
    this.desktopStepAccumulator = 0;
    this.forwardConfirmed = false;
    this.keys = new Set();
    this.resetGameStats();
    this.bindUI();
    this.renderCapabilities();
    this.loop(performance.now());
  }

  resetGameStats() {
    this.ghostDistance = CONFIG.INITIAL_GHOST_DISTANCE;
    this.playerSpeed = 0;
    this.signedPlayerSpeed = 0;
    this.playerPosition = 0;
    this.playerDistance = 0;
    this.elapsed = 0;
    this.survivalTime = 0;
    this.totalSpeed = 0;
    this.speedSamples = 0;
    this.closestDistance = CONFIG.INITIAL_GHOST_DISTANCE;
    this.alertLevel = ALERT_LEVELS.NONE;
    this.keyboardCadence = 0;
    this.desktopStepAccumulator = 0;
    this.stepDetector.reset();
    this.haptics.lastAlertLevel = ALERT_LEVELS.NONE;
  }

  bindUI() {
    elements.startButton.addEventListener("click", () => this.startMobile());
    elements.desktopButton.addEventListener("click", () => this.startDesktop());
    elements.confirmForwardButton.addEventListener("click", () => this.confirmForwardDirection());
    elements.skipCalibrationButton.addEventListener("click", () => this.startCalibrationCountdown());
    elements.manualLeftButton.addEventListener("click", () => this.adjustManualCalibration("yaw", CONFIG.MANUAL_CALIBRATION_STEP));
    elements.manualRightButton.addEventListener("click", () => this.adjustManualCalibration("yaw", -CONFIG.MANUAL_CALIBRATION_STEP));
    elements.manualUpButton.addEventListener("click", () => this.adjustManualCalibration("pitch", CONFIG.MANUAL_CALIBRATION_STEP));
    elements.manualDownButton.addEventListener("click", () => this.adjustManualCalibration("pitch", -CONFIG.MANUAL_CALIBRATION_STEP));
    elements.manualResetButton.addEventListener("click", () => this.resetManualCalibration());
    elements.pauseButton.addEventListener("click", () => this.pause());
    elements.recalibrateButton.addEventListener("click", () => this.beginCalibration());
    elements.resumeButton.addEventListener("click", () => this.resume());
    elements.pauseRecalibrateButton.addEventListener("click", () => this.beginCalibration());
    elements.muteButton.addEventListener("click", () => this.toggleAudio());
    elements.vibrationButton.addEventListener("click", () => this.toggleVibration());
    elements.quitButton.addEventListener("click", () => this.showHome());
    elements.restartButton.addEventListener("click", () => this.beginCalibration());
    elements.homeButton.addEventListener("click", () => this.showHome());

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === GAME_STATES.PLAYING) {
        this.pause();
      }
    });

    window.addEventListener("keydown", (event) => {
      this.keys.add(event.key.toLowerCase());
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
  }

  renderCapabilities() {
    const capabilities = this.sensors.getCapabilities();
    const items = [
      ["HTTPS", capabilities.secure],
      ["Orientation sensor", capabilities.orientation],
      ["Motion sensor", capabilities.motion],
      ["Vibration", capabilities.vibration],
    ];

    elements.capabilityList.innerHTML = items
      .map(([label, ok]) => `<span class="${ok ? "ok" : "warn"}">${ok ? "OK" : "!"} ${label}</span>`)
      .join("");
  }

  async startMobile() {
    this.desktopMode = false;
    try {
      await this.audio.unlock();
      await this.sensors.requestPermissions();
      this.sensors.start();
      this.unsubscribeMotion?.();
      this.unsubscribeMotion = this.sensors.onMotion((event) => this.stepDetector.handleMotion(event));
      this.beginCalibration();
    } catch (error) {
      this.showMessage(error.message || "Unable to start sensors. Check browser permissions.");
    }
  }

  async startDesktop() {
    this.desktopMode = true;
    await this.audio.unlock();
    this.showMessage("Desktop test mode: drag to look around, press W/S to simulate cadence.");
    this.beginCalibration();
  }

  beginCalibration() {
    this.resetGameStats();
    this.renderer.resetOrientation();
    this.forwardConfirmed = false;
    this.setState(GAME_STATES.CALIBRATING);
    this.updateManualCalibrationReadout();
    elements.calibrationHelp.textContent =
      "站在起点，身体面向你要逃跑的方向，手机平视前方，然后点确认。";
    elements.forwardStep.hidden = false;
    elements.manualStep.hidden = true;
    elements.countdown.textContent = "READY";
    elements.countdown.classList.add("countdown-idle");
    elements.skipCalibrationButton.disabled = true;
    clearInterval(this.calibrationTimer);
  }

  confirmForwardDirection() {
    if (this.state !== GAME_STATES.CALIBRATING) {
      return;
    }

    this.sensors.calibrate();
    this.renderer.resetOrientation();
    this.forwardConfirmed = true;
    elements.calibrationHelp.textContent = "这个方向现在就是游戏正前方。需要的话再微调，然后开始追逐。";
    elements.forwardStep.hidden = true;
    elements.manualStep.hidden = false;
    elements.skipCalibrationButton.disabled = false;
    this.updateManualCalibrationReadout();
  }

  startCalibrationCountdown() {
    if (this.state !== GAME_STATES.CALIBRATING || !this.forwardConfirmed) {
      this.showMessage("Face your real-world forward direction first, then confirm it.");
      return;
    }

    let count = 3;
    elements.countdown.textContent = String(count);
    elements.countdown.classList.remove("countdown-idle");
    elements.skipCalibrationButton.disabled = true;
    clearInterval(this.calibrationTimer);

    this.calibrationTimer = setInterval(() => {
      count -= 1;
      elements.countdown.textContent = String(Math.max(count, 0));
      if (count <= 0) {
        clearInterval(this.calibrationTimer);
        this.finishCalibration();
      }
    }, 1000);
  }

  finishCalibration() {
    clearInterval(this.calibrationTimer);
    elements.skipCalibrationButton.disabled = false;
    this.renderer.resetOrientation();
    this.resetGameStats();
    this.lastFrameTime = performance.now();
    this.setState(GAME_STATES.PLAYING);
  }

  adjustManualCalibration(axis, amount) {
    this.sensors.adjustManualOffset(axis, amount);
    this.renderer.resetOrientation();
    this.updateManualCalibrationReadout();
  }

  resetManualCalibration() {
    this.sensors.resetManualOffsets();
    this.renderer.resetOrientation();
    this.updateManualCalibrationReadout();
  }

  updateManualCalibrationReadout() {
    const offsets = this.sensors.getManualOffsets();
    elements.manualYawValue.textContent = `${Math.round(offsets.yaw)}°`;
    elements.manualPitchValue.textContent = `${Math.round(offsets.pitch)}°`;
  }

  pause() {
    if (this.state !== GAME_STATES.PLAYING) {
      return;
    }
    this.audio.stop();
    this.setState(GAME_STATES.PAUSED);
  }

  resume() {
    this.lastFrameTime = performance.now();
    this.setState(GAME_STATES.PLAYING);
  }

  showHome() {
    clearInterval(this.calibrationTimer);
    this.audio.stop();
    this.resetGameStats();
    this.setState(GAME_STATES.START);
  }

  toggleAudio() {
    const enabled = this.audio.toggle();
    this.showMessage(enabled ? "Audio on" : "Audio off");
  }

  toggleVibration() {
    const enabled = this.haptics.toggle();
    this.showMessage(enabled ? "Vibration on" : "Vibration off");
  }

  setState(nextState) {
    this.state = nextState;
    for (const screen of [elements.startScreen, elements.calibrationScreen, elements.pauseScreen, elements.endScreen]) {
      screen.classList.remove("screen-active");
    }
    elements.gameScreen.classList.toggle("game-ui-active", nextState === GAME_STATES.PLAYING);

    if (nextState === GAME_STATES.START) {
      elements.startScreen.classList.add("screen-active");
    } else if (nextState === GAME_STATES.CALIBRATING) {
      elements.calibrationScreen.classList.add("screen-active");
    } else if (nextState === GAME_STATES.PAUSED) {
      elements.pauseScreen.classList.add("screen-active");
    } else if (nextState === GAME_STATES.ENDED) {
      elements.endScreen.classList.add("screen-active");
    }
  }

  loop(now) {
    const delta = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    if (this.state === GAME_STATES.PLAYING) {
      this.updateGame(delta, now);
    }

    const orientation = this.desktopMode ? null : this.sensors.getRelativeOrientation();

    this.renderer.update(
      {
        ghostDistance: this.ghostDistance,
        alertLevel: this.alertLevel,
        playerPosition: this.playerPosition,
        playerSpeed: this.playerSpeed,
      },
      orientation,
      this.desktopMode
    );

    this.updateHud(now);
    requestAnimationFrame((time) => this.loop(time));
  }

  updateGame(delta, now) {
    const stepState = this.getStepState(delta, now);
    const rate =
      stepState.speed > this.playerSpeed ? CONFIG.PLAYER_SPEED_ACCELERATION : CONFIG.PLAYER_SPEED_DECELERATION;
    this.playerSpeed = moveToward(this.playerSpeed, stepState.speed, rate * delta);
    const movementFactor = this.getForwardMovementFactor();
    this.signedPlayerSpeed = this.playerSpeed * movementFactor;
    this.playerPosition += this.signedPlayerSpeed * delta;
    this.playerDistance += Math.abs(this.signedPlayerSpeed) * delta;

    const distanceDelta = (this.signedPlayerSpeed - CONFIG.GHOST_SPEED) * delta;
    this.ghostDistance = Math.max(0, this.ghostDistance + distanceDelta);
    this.elapsed += delta;
    this.survivalTime = this.elapsed;
    this.totalSpeed += this.playerSpeed;
    this.speedSamples += 1;
    this.closestDistance = Math.min(this.closestDistance, this.ghostDistance);

    this.alertLevel = this.getAlertLevel();
    this.haptics.updateAlert(this.alertLevel);
    this.audio.update(this.ghostDistance, this.alertLevel);

    if (this.ghostDistance <= CONFIG.CAUGHT_DISTANCE) {
      this.endGame("caught");
    } else if (this.elapsed >= CONFIG.GAME_DURATION) {
      this.endGame("win");
    }
  }

  getStepState(delta, now) {
    if (this.desktopMode) {
      if (this.keys.has("w") || this.keys.has("arrowup")) {
        this.keyboardCadence = Math.min(CONFIG.MAX_CADENCE, this.keyboardCadence + 140 * delta);
      } else if (this.keys.has("s") || this.keys.has("arrowdown")) {
        this.keyboardCadence = Math.max(0, this.keyboardCadence - 180 * delta);
      } else {
        this.keyboardCadence *= 0.985;
      }
      this.stepDetector.cadence = this.keyboardCadence;
      this.stepDetector.currentSpeed = this.stepDetector.mapCadenceToSpeed(this.keyboardCadence);
      this.desktopStepAccumulator += (this.keyboardCadence / 60) * delta;
      while (this.desktopStepAccumulator >= 1) {
        this.stepDetector.totalSteps += 1;
        this.desktopStepAccumulator -= 1;
      }
    }
    return this.stepDetector.getState(now);
  }

  getForwardMovementFactor() {
    if (this.desktopMode) {
      return 1;
    }

    const orientation = this.sensors.getRelativeOrientation();
    const yaw = orientation.available ? orientation.yaw : 0;
    const rawFactor = Math.cos((yaw * Math.PI) / 180);
    if (Math.abs(rawFactor) < CONFIG.MOVEMENT_SIDE_DEADZONE) {
      return 0;
    }

    const sign = Math.sign(rawFactor);
    const normalized =
      (Math.abs(rawFactor) - CONFIG.MOVEMENT_SIDE_DEADZONE) / (1 - CONFIG.MOVEMENT_SIDE_DEADZONE);
    return sign * Math.min(1, Math.max(0, normalized));
  }

  getAlertLevel() {
    if (this.ghostDistance <= CONFIG.RED_ALERT_DISTANCE) {
      return ALERT_LEVELS.RED;
    }
    if (this.ghostDistance <= CONFIG.ORANGE_ALERT_DISTANCE) {
      return ALERT_LEVELS.ORANGE;
    }
    return ALERT_LEVELS.NONE;
  }

  endGame(reason) {
    this.audio.stop();
    if (reason === "caught") {
      this.audio.playCaught();
      this.haptics.caught();
    }
    this.populateResults(reason);
    this.setState(GAME_STATES.ENDED);
  }

  populateResults(reason) {
    const averageSpeed = this.speedSamples ? this.totalSpeed / this.speedSamples : 0;
    elements.resultEyebrow.textContent = reason === "win" ? "Escaped" : "Caught";
    elements.resultTitle.textContent = reason === "win" ? "Escaped for 90 seconds!" : "Caught by the ghost!";
    elements.survivalValue.textContent = `${Math.round(this.survivalTime)}s`;
    elements.stepsValue.textContent = String(this.stepDetector.totalSteps);
    elements.averageSpeedValue.textContent = `${averageSpeed.toFixed(1)} m/s`;
    elements.closestValue.textContent = `${this.closestDistance.toFixed(1)}m`;
  }

  updateHud(now) {
    const stepState = this.stepDetector.getState(now);
    elements.distanceValue.textContent = this.ghostDistance.toFixed(1);
    elements.speedValue.textContent = this.playerSpeed.toFixed(1);
    elements.cadenceValue.textContent = String(Math.round(stepState.cadence));
    elements.timerValue.textContent = String(Math.max(0, Math.ceil(CONFIG.GAME_DURATION - this.elapsed)));
    elements.alertOverlay.className = `alert-overlay alert-${this.alertLevel}`;

    if (CONFIG.DEBUG) {
      elements.debugPanel.hidden = false;
      const sensorDebug = this.sensors.getDebugState();
      const renderDebug = this.renderer.getDebugState();
      elements.debugPanel.textContent = [
        `state=${this.state}`,
        `desktop=${this.desktopMode}`,
        `yaw=${sensorDebug.orientation?.relativeYaw?.toFixed(1) ?? "n/a"}`,
        `pitch=${sensorDebug.orientation?.pitch?.toFixed(1) ?? "n/a"}`,
        `roll=${sensorDebug.orientation?.roll?.toFixed(1) ?? "n/a"}`,
        `run=${this.playerDistance.toFixed(1)}m`,
        `pos=${this.playerPosition.toFixed(1)}m`,
        `signed=${this.signedPlayerSpeed.toFixed(1)}`,
        `camZ=${renderDebug.cameraZ.toFixed(1)}`,
        `motion=${sensorDebug.hasMotion}`,
        `mag=${stepState.lastMagnitude.toFixed(1)}`,
      ].join(" | ");
    }
  }

  showMessage(message) {
    elements.messageToast.textContent = message;
    elements.messageToast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      elements.messageToast.hidden = true;
    }, 4200);
  }
}

new GhostGame();

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maxDelta;
}
