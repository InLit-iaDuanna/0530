import { CONFIG, ALERT_LEVELS } from "./config.js";

export class HapticsManager {
  constructor() {
    this.enabled = localStorage.getItem("ghost-demo-vibration") !== "off";
    this.lastAlertLevel = ALERT_LEVELS.NONE;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem("ghost-demo-vibration", enabled ? "on" : "off");
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  updateAlert(level) {
    if (level === this.lastAlertLevel) {
      return;
    }

    this.lastAlertLevel = level;
    if (level === ALERT_LEVELS.ORANGE) {
      this.trigger(CONFIG.VIBRATION_ORANGE);
    } else if (level === ALERT_LEVELS.RED) {
      this.trigger(CONFIG.VIBRATION_RED);
    }
  }

  caught() {
    this.trigger(CONFIG.VIBRATION_CAUGHT);
  }

  trigger(pattern) {
    if (this.enabled && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }
}
