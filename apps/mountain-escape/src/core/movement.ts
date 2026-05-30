import * as THREE from 'three';
import { resolveWorldCollisions } from '../collision';
import type { SceneContext } from './scene-context';

export function resetPlayer(ctx: SceneContext, position: THREE.Vector3, yaw = 0): void {
  ctx.camera.position.copy(position);
  ctx.firstPerson.setYawPitch(yaw, 0);
  ctx.player.totalSteps = 0;
  ctx.player.frameSteps = 0;
  ctx.player.lastCollision = false;
}

export function applyStepMovement(ctx: SceneContext, steps: number, gain = 0.42): void {
  if (steps <= 0) {
    return;
  }

  const yaw = ctx.firstPerson.yaw;
  ctx.camera.position.x -= Math.sin(yaw) * steps * gain;
  ctx.camera.position.z -= Math.cos(yaw) * steps * gain;
}

export function applyLateralMovement(ctx: SceneContext, dt: number, speed = 1.8): void {
  const axis = ctx.keyboard.lateralAxis();
  if (axis === 0) {
    return;
  }

  const yaw = ctx.firstPerson.yaw + Math.PI * 0.5;
  ctx.camera.position.x += Math.sin(yaw) * axis * speed * dt;
  ctx.camera.position.z += Math.cos(yaw) * axis * speed * dt;
}

export function resolvePlayerCollisions(
  ctx: SceneContext,
  onHit?: Parameters<typeof resolveWorldCollisions>[2],
): boolean {
  const hit = resolveWorldCollisions(ctx.camera.position, ctx.colliders, onHit);
  ctx.player.lastCollision = hit;
  return hit;
}
