import type { MotionSample, Vec3 } from '../../src/lib/types';

interface SynthesisOptions {
  durationMs: number;
  sampleRateHz: number;
  vertAmplitude: number;
  horzAmplitude: number;
  gyroAmplitude: number;
  cadenceHz: number;
  jitterFrac: number;
  spikeShape: 'sine' | 'spike' | 'noise';
}

const GRAVITY: Vec3 = { x: 0, y: -9.81, z: 0 };

export const synthesize = (opts: SynthesisOptions): MotionSample[] => {
  const samples: MotionSample[] = [];
  const dt = 1000 / opts.sampleRateHz;
  const total = Math.round(opts.durationMs / dt);

  let phase = 0;
  for (let i = 0; i < total; i += 1) {
    const t = i * dt;
    const phaseStep = (2 * Math.PI * opts.cadenceHz) / opts.sampleRateHz;
    phase += phaseStep * (1 + (Math.random() - 0.5) * opts.jitterFrac);

    let vert = 0;

    if (opts.spikeShape === 'sine') {
      vert = opts.vertAmplitude * Math.sin(phase);
    } else if (opts.spikeShape === 'spike') {
      const cycle = phase % (2 * Math.PI);
      const pulse = cycle < 0.4 ? Math.sin((cycle / 0.4) * Math.PI) : 0;
      vert = opts.vertAmplitude * pulse;
    } else {
      vert = opts.vertAmplitude * (Math.random() - 0.5) * 2;
    }

    const horz =
      opts.horzAmplitude *
      (Math.sin(phase * 0.7 + 0.3) + (Math.random() - 0.5) * 0.4);

    const accel: Vec3 = {
      x: horz * 0.5,
      y: vert,
      z: horz * 0.5,
    };

    const gyro: Vec3 = {
      x: opts.gyroAmplitude * (Math.random() - 0.5),
      y: opts.gyroAmplitude * (Math.random() - 0.5),
      z: opts.gyroAmplitude * (Math.random() - 0.5),
    };

    samples.push({ t, accel, gyro, gravity: GRAVITY });
  }

  return samples;
};

export const idleSamples = (): MotionSample[] =>
  synthesize({
    durationMs: 2600,
    sampleRateHz: 50,
    vertAmplitude: 0.05,
    horzAmplitude: 0.04,
    gyroAmplitude: 0.02,
    cadenceHz: 0.5,
    jitterFrac: 0.6,
    spikeShape: 'noise',
  });

export const shuffleSamples = (): MotionSample[] =>
  synthesize({
    durationMs: 2600,
    sampleRateHz: 50,
    vertAmplitude: 0.7,
    horzAmplitude: 1.4,
    gyroAmplitude: 0.4,
    cadenceHz: 1.6,
    jitterFrac: 0.45,
    spikeShape: 'sine',
  });

export const stepSamples = (): MotionSample[] =>
  synthesize({
    durationMs: 2600,
    sampleRateHz: 50,
    vertAmplitude: 5.5,
    horzAmplitude: 1.0,
    gyroAmplitude: 1.2,
    cadenceHz: 2.4,
    jitterFrac: 0.08,
    spikeShape: 'spike',
  });
