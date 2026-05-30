export class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.ambientOscillator = null;
    this.ambientGain = null;
    this.stepOscillator = null;
    this.stepGain = null;
    this.heartbeatOscillator = null;
    this.heartbeatGain = null;
    this.growlOscillator = null;
    this.growlGain = null;
    this.lastRoarTime = 0;
    this.enabled = localStorage.getItem("ghost-demo-audio") !== "off";
  }

  async unlock() {
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        return;
      }

      this.context = new AudioContextCtor();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.45 : 0;
      this.master.connect(this.context.destination);
      this.createLoop("ambient");
      this.createLoop("steps");
      this.createLoop("heartbeat");
      this.createLoop("growl");
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("ghost-demo-audio", this.enabled ? "on" : "off");
    if (this.master) {
      this.master.gain.setTargetAtTime(this.enabled ? 0.45 : 0, this.context.currentTime, 0.05);
    }
    return this.enabled;
  }

  update(distance, alertLevel) {
    if (!this.context || !this.master) {
      return;
    }

    const now = this.context.currentTime;
    const closeness = Math.max(0, Math.min(1, 1 - distance / 30));
    this.stepGain.gain.setTargetAtTime(closeness * 0.34, now, 0.06);
    this.stepOscillator.frequency.setTargetAtTime(2 + closeness * 7, now, 0.08);
    this.growlGain.gain.setTargetAtTime(closeness * closeness * 0.22, now, 0.08);
    this.growlOscillator.frequency.setTargetAtTime(34 + closeness * 28, now, 0.12);

    if (alertLevel === "red") {
      this.heartbeatGain.gain.setTargetAtTime(0.18, now, 0.05);
      this.heartbeatOscillator.frequency.setTargetAtTime(3.2, now, 0.05);
      if (now - this.lastRoarTime > 2.4) {
        this.playRoar(1);
        this.lastRoarTime = now;
      }
    } else if (alertLevel === "orange") {
      this.heartbeatGain.gain.setTargetAtTime(0.1, now, 0.05);
      this.heartbeatOscillator.frequency.setTargetAtTime(2.2, now, 0.05);
      if (now - this.lastRoarTime > 4.2) {
        this.playRoar(0.55);
        this.lastRoarTime = now;
      }
    } else {
      this.heartbeatGain.gain.setTargetAtTime(0, now, 0.08);
    }
  }

  playCaught() {
    if (!this.context || !this.master) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(42, now + 0.65);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.8);
  }

  playRoar(intensity = 1) {
    if (!this.context || !this.master) {
      return;
    }

    const now = this.context.currentTime;
    const roarGain = this.context.createGain();
    const low = this.context.createOscillator();
    const rasp = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const noiseGain = this.context.createGain();
    const noiseSource = this.createNoiseBurst(1.15);

    roarGain.gain.setValueAtTime(0.0001, now);
    roarGain.gain.exponentialRampToValueAtTime(0.26 * intensity, now + 0.08);
    roarGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.18);

    low.type = "sawtooth";
    low.frequency.setValueAtTime(96, now);
    low.frequency.exponentialRampToValueAtTime(34, now + 1.05);

    rasp.type = "square";
    rasp.frequency.setValueAtTime(47, now);
    rasp.frequency.exponentialRampToValueAtTime(29, now + 0.9);
    rasp.detune.setValueAtTime(-18, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(920, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 1.1);
    filter.Q.value = 6;

    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.16 * intensity, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.92);

    low.connect(roarGain);
    rasp.connect(roarGain);
    noiseSource.connect(filter).connect(noiseGain).connect(roarGain);
    roarGain.connect(this.master);

    low.start(now);
    rasp.start(now);
    noiseSource.start(now);
    low.stop(now + 1.2);
    rasp.stop(now + 1.2);
    noiseSource.stop(now + 1.2);
  }

  stop() {
    if (!this.context) {
      return;
    }
    const now = this.context.currentTime;
    this.stepGain.gain.setTargetAtTime(0, now, 0.05);
    this.heartbeatGain.gain.setTargetAtTime(0, now, 0.05);
    this.growlGain.gain.setTargetAtTime(0, now, 0.05);
  }

  createLoop(type) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    gain.gain.value = 0;

    if (type === "ambient") {
      oscillator.type = "triangle";
      oscillator.frequency.value = 58;
      gain.gain.value = 0.035;
      this.ambientOscillator = oscillator;
      this.ambientGain = gain;
    } else if (type === "steps") {
      oscillator.type = "square";
      oscillator.frequency.value = 2;
      this.stepOscillator = oscillator;
      this.stepGain = gain;
    } else if (type === "heartbeat") {
      oscillator.type = "sine";
      oscillator.frequency.value = 2;
      this.heartbeatOscillator = oscillator;
      this.heartbeatGain = gain;
    } else {
      oscillator.type = "sawtooth";
      oscillator.frequency.value = 38;
      this.growlOscillator = oscillator;
      this.growlGain = gain;
    }

    oscillator.connect(gain).connect(this.master);
    oscillator.start();
  }

  createNoiseBurst(duration) {
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      const t = index / data.length;
      const envelope = Math.sin(Math.PI * t);
      data[index] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    return source;
  }
}
