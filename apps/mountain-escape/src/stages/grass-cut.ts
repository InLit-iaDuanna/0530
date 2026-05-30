import * as THREE from 'three';
import { disposeObject } from '../collision';
import type { GameStage } from '../core/game-state';
import { applyLateralMovement, applyStepMovement, resetPlayer, resolvePlayerCollisions } from '../core/movement';
import type { SceneContext } from '../core/scene-context';
import { createGrassPatch, type GrassPatch } from '../scene/grass';

export const grassCutStage: GameStage = (() => {
  let group: THREE.Group | null = null;
  let patch: GrassPatch | null = null;
  let steps = 0;
  let onCut: (() => void) | null = null;

  function cut(ctx: SceneContext): void {
    const cutCount = patch?.cutNear(ctx.camera.position, ctx.firstPerson.yaw) ?? 0;
    if (cutCount > 0) {
      ctx.audio.cut();
    }
  }

  return {
    enter(ctx: SceneContext): void {
      steps = 0;
      ctx.scene.background = new THREE.Color('#8ba38e');
      ctx.scene.fog = new THREE.Fog('#8ba38e', 18, 48);
      group = new THREE.Group();
      const sun = new THREE.DirectionalLight('#fff0c8', 2.3);
      sun.position.set(4, 8, 4);
      group.add(sun, new THREE.HemisphereLight('#cce6ff', '#385326', 1.6));
      patch = createGrassPatch();
      group.add(patch.group);
      ctx.scene.add(group);
      ctx.colliders.push(...patch.colliders);
      resetPlayer(ctx, new THREE.Vector3(0, 1.55, 1.6), 0);
      onCut = () => cut(ctx);
      ctx.canvas.addEventListener('pointerdown', onCut);
      ctx.overlay.setHud(['割开高草', '点击或触屏挥刀', '已走 0 / 30 步']);
    },
    update(dt: number, ctx: SceneContext): void {
      steps += ctx.player.frameSteps;
      applyStepMovement(ctx, ctx.player.frameSteps, 0.42);
      applyLateralMovement(ctx, dt, 2.2);
      resolvePlayerCollisions(ctx);
      ctx.overlay.setHud([
        '割开高草',
        `已走 ${Math.min(steps, 30)} / 30 步`,
        `剩余高草 ${patch?.remaining() ?? 0}`,
      ]);
      if (steps >= 30 && ctx.camera.position.z < -9.8) {
        ctx.transitionTo('narration-2');
      }
    },
    exit(ctx: SceneContext): void {
      if (onCut) {
        ctx.canvas.removeEventListener('pointerdown', onCut);
        onCut = null;
      }
      if (group) {
        ctx.scene.remove(group);
        disposeObject(group);
        group = null;
      }
      patch = null;
      ctx.scene.fog = null;
    },
  };
})();
