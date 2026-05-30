import type { MotionSample, Vec3 } from '../../src/lib/types';

interface SynthesisOptions {
  durationMs: number;
  sampleRateHz: number;
  vertAmplitude: number;
  horzAmplitude: number;
  gyroAmplitude: number;
  cadenceHz: number;
  jitterFrac: number;
  spikeShape: 'sine' | 'spike' | 'noise' | 'rotate';
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
    } else if (opts.spikeShape === 'rotate') {
      vert = opts.vertAmplitude * Math.sin(phase);
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
      x:
        opts.spikeShape === 'rotate'
          ? opts.gyroAmplitude * Math.sin(phase * 1.2)
          : opts.gyroAmplitude * (Math.random() - 0.5),
      y:
        opts.spikeShape === 'rotate'
          ? opts.gyroAmplitude * Math.cos(phase * 0.9)
          : opts.gyroAmplitude * (Math.random() - 0.5),
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

export const smallWalkSamples = (): MotionSample[] =>
  synthesize({
    durationMs: 2600,
    sampleRateHz: 50,
    vertAmplitude: 0.85,
    horzAmplitude: 1.55,
    gyroAmplitude: 8,
    cadenceHz: 1.8,
    jitterFrac: 0.08,
    spikeShape: 'sine',
  });

export const handSpoofSamples = (): MotionSample[] =>
  synthesize({
    durationMs: 2600,
    sampleRateHz: 50,
    vertAmplitude: 3.3,
    horzAmplitude: 0.12,
    gyroAmplitude: 4,
    cadenceHz: 1.9,
    jitterFrac: 0.02,
    spikeShape: 'sine',
  });

export const rotationSpoofSamples = (): MotionSample[] =>
  synthesize({
    durationMs: 2600,
    sampleRateHz: 50,
    vertAmplitude: 0.65,
    horzAmplitude: 0.9,
    gyroAmplitude: 120,
    cadenceHz: 1.8,
    jitterFrac: 0.08,
    spikeShape: 'rotate',
  });
