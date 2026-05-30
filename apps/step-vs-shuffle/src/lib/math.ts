import type { Vec3 } from './types';

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

export const dot3 = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

export const magnitude3 = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);

export const scale3 = (v: Vec3, k: number): Vec3 => ({ x: v.x * k, y: v.y * k, z: v.z * k });

export const sub3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const normalize3 = (v: Vec3): Vec3 => {
  const m = magnitude3(v);

  if (m < 1e-6) {
    return { x: 0, y: 1, z: 0 };
  }

  return { x: v.x / m, y: v.y / m, z: v.z / m };
};

export const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((sum, value) => sum + value, 0) / xs.length;

export const variance = (xs: readonly number[]): number => {
  if (xs.length < 2) {
    return 0;
  }

  const m = mean(xs);
  return xs.reduce((sum, value) => sum + (value - m) ** 2, 0) / xs.length;
};

export const rms = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : Math.sqrt(xs.reduce((sum, v) => sum + v * v, 0) / xs.length);
