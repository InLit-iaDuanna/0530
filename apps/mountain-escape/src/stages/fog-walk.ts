import * as THREE from 'three';
import { disposeObject } from '../collision';
import type { GameStage } from '../core/game-state';
import { applyLateralMovement, applyStepMovement, resetPlayer, resolvePlayerCollisions } from '../core/movement';
import type { SceneContext } from '../core/scene-context';
import { createForest } from '../scene/forest';

export const fogWalkStage: GameStage = (() => {
  let group: THREE.Group | null = null;
  let steps = 0;
  let lastHitAt = 0;
  const target = new THREE.Vector3(0, 1.5, -22);

  return {
    enter(ctx: SceneContext): void {
      steps = 0;
      lastHitAt = 0;
      ctx.scene.background = new THREE.Color('#9aaab2');
      ctx.scene.fog = new THREE.FogExp2('#9aaab2', 0.18);
      const forest = createForest({ count: 70, radius: 24, clearingRadius: 3.2, seed: 41 });
      group = forest.group;
      group.add(new THREE.HemisphereLight('#c9e7ff', '#27331f', 1.25));
      const guide = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 10),
        new THREE.MeshBasicMaterial({ color: '#dbeea4' }),
      );
      guide.position.copy(target);
      group.add(guide);
      ctx.scene.add(group);
      ctx.colliders.push(...forest.colliders);
      resetPlayer(ctx, new THREE.Vector3(0, 1.55, 2), 0);
      ctx.audio.startGuide();
    },
    update(dt: number, ctx: SceneContext): void {
      steps += ctx.player.frameSteps;
      applyStepMovement(ctx, ctx.player.frameSteps, 0.42);
      applyLateralMovement(ctx, dt, 2);
      const now = performance.now();
      resolvePlayerCollisions(ctx, () => {
        if (now - lastHitAt > 350) {
          lastHitAt = now;
          ctx.overlay.flashHit();
          ctx.audio.hit();
        }
      });
      const toTarget = target.clone().sub(ctx.camera.position);
      const bearing = Math.atan2(-toTarget.x, -toTarget.z);
      const diff = Math.atan2(
        Math.sin(bearing - ctx.firstPerson.yaw),
        Math.cos(bearing - ctx.firstPerson.yaw),
      );
      ctx.audio.updateGuidePan(diff / (Math.PI * 0.5));
      if (ctx.scene.fog instanceof THREE.FogExp2 && steps >= 50) {
        ctx.scene.fog.density = THREE.MathUtils.lerp(ctx.scene.fog.density, 0.02, dt * 1.8);
      }
      ctx.overlay.setHud([
        '雾林',
        `已走 ${Math.min(steps, 50)} / 50 步`,
        '跟着鸟叫和水声的方向前进',
      ]);
      if (steps >= 50 && ctx.camera.position.distanceTo(target) < 7.5) {
        ctx.transitionTo('narration-3');
      }
    },
    exit(ctx: SceneContext): void {
      ctx.audio.stopGuide();
      if (group) {
        ctx.scene.remove(group);
        disposeObject(group);
        group = null;
      }
      ctx.scene.fog = null;
    },
  };
})();
