import { clamp } from '../lib/lowpass';

export class Sfx {
  private ctx: AudioContext | null = null;
  private guideGain: GainNode | null = null;
  private guidePan: StereoPannerNode | null = null;
  private guideNodes: AudioNode[] = [];

  async unlock(): Promise<void> {
    this.ensureContext();
    await this.ctx?.resume();
  }

  startGuide(): void {
    const audio = this.ensureContext();
    this.stopGuide();

    const master = audio.createGain();
    master.gain.value = 0.16;
    const pan = audio.createStereoPanner();
    master.connect(pan).connect(audio.destination);

    const bird = audio.createOscillator();
    bird.type = 'sine';
    bird.frequency.value = 1260;
    const birdGain = audio.createGain();
    birdGain.gain.value = 0.035;
    bird.connect(birdGain).connect(master);
    bird.start();

    const water = audio.createBufferSource();
    const noise = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    water.buffer = noise;
    water.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const waterGain = audio.createGain();
    waterGain.gain.value = 0.07;
    water.connect(filter).connect(waterGain).connect(master);
    water.start();

    this.guideGain = master;
    this.guidePan = pan;
    this.guideNodes = [bird, water, filter, birdGain, waterGain, master, pan];
  }

  updateGuidePan(pan: number): void {
    if (this.guidePan) {
      this.guidePan.pan.value = clamp(pan, -1, 1);
    }
  }

  stopGuide(): void {
    if (!this.guideNodes.length) {
      return;
    }

    for (const node of this.guideNodes) {
      if ('stop' in node && typeof node.stop === 'function') {
        try {
          node.stop();
        } catch {
          // Already stopped.
        }
      }
      node.disconnect();
    }
    this.guideGain = null;
    this.guidePan = null;
    this.guideNodes = [];
  }

  hit(): void {
    this.playTone(82, 0.12, 'square', 0.18);
  }

  cut(): void {
    this.playTone(420, 0.05, 'sawtooth', 0.08);
  }

  roar(): void {
    this.playTone(58, 0.45, 'sawtooth', 0.2);
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    const audio = this.ensureContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }
}
