import * as THREE from 'three';
import { disposeObject } from '../collision';
import type { GameStage } from '../core/game-state';
import { resetPlayer } from '../core/movement';
import type { SceneContext } from '../core/scene-context';
import { createBear } from '../scene/bear';
import { ChaseAI, DEFAULT_CHASE_CONFIG } from '../scene/chase-ai';
import { createForest } from '../scene/forest';
import { clamp } from '../lib/lowpass';

export const bearChaseStage: GameStage = (() => {
  let group: THREE.Group | null = null;
  let bear: THREE.Group | null = null;
  let chase = new ChaseAI();
  let phase: 'sneak' | 'chase' = 'sneak';
  let steps = 0;
  let chaseElapsed = 0;
  let alarm = 0;

  function enterChase(ctx: SceneContext, initialDistance: number): void {
    phase = 'chase';
    chaseElapsed = 0;
    chase = new ChaseAI({ ...DEFAULT_CHASE_CONFIG, INITIAL_DISTANCE: initialDistance });
    chase.reset();
    ctx.audio.roar();
  }

  function resetStage(ctx: SceneContext): void {
    phase = 'sneak';
    steps = 0;
    chaseElapsed = 0;
    alarm = 0;
    resetPlayer(ctx, new THREE.Vector3(0, 1.55, 4), 0);
    chase = new ChaseAI();
    chase.reset();
  }

  return {
    enter(ctx: SceneContext): void {
      ctx.scene.background = new THREE.Color('#0c0c0b');
      ctx.scene.fog = new THREE.FogExp2('#10110f', 0.09);
      const forest = createForest({ count: 85, radius: 30, clearingRadius: 4, seed: 83, dark: true });
      group = forest.group;
      group.add(new THREE.HemisphereLight('#414b53', '#130e0b', 1.1));
      const moon = new THREE.DirectionalLight('#879ab4', 1.4);
      moon.position.set(-6, 9, 6);
      group.add(moon);

      for (let i = 0; i < 12; i += 1) {
        const print = new THREE.Mesh(
          new THREE.CircleGeometry(0.24, 16),
          new THREE.MeshBasicMaterial({ color: '#090706', transparent: true, opacity: 0.65 }),
        );
        print.position.set((i % 2 === 0 ? -0.25 : 0.25), 0.018, 2 - i * 1.6);
        print.rotation.x = -Math.PI * 0.5;
        print.scale.set(0.75, 1.4, 1);
        group.add(print);
      }

      bear = createBear();
      group.add(bear);
      ctx.scene.add(group);
      ctx.colliders.push(...forest.colliders);
      resetStage(ctx);
    },
    update(dt: number, ctx: SceneContext): void {
      steps += ctx.player.frameSteps;
      if (phase === 'sneak') {
        const shake = ctx.keyboard.isRunning() ? 2.4 : ctx.shake.rms();
        if (shake > 0.6) {
          alarm += (shake - 0.6) * dt * 42;
        } else {
          alarm -= dt * 10;
        }
        alarm = clamp(alarm, 0, 100);
        ctx.camera.position.x -= Math.sin(ctx.firstPerson.yaw) * ctx.player.frameSteps * 0.34;
        ctx.camera.position.z -= Math.cos(ctx.firstPerson.yaw) * ctx.player.frameSteps * 0.34;
        if (alarm >= 100) {
          enterChase(ctx, 11);
        } else if (steps >= 30) {
          enterChase(ctx, 16);
        }
        ctx.overlay.setDanger(alarm / 160);
        ctx.overlay.setHud([
          '蹑手蹑脚',
          `已走 ${Math.min(steps, 30)} / 30 步`,
          `惊扰度 ${Math.round(alarm)} / 100`,
          '桌面端按 Shift 会模拟动作过大',
        ]);
        return;
      }

      chaseElapsed += dt;
      const snapshot = chase.update({
        dt,
        elapsed: chaseElapsed,
        playerYaw: ctx.firstPerson.yaw,
        forwardAxis: ctx.keyboard.forwardAxis(),
        stepCount: ctx.player.frameSteps,
      });
      ctx.camera.position.set(snapshot.player.x, 1.55, snapshot.player.z);
      if (bear) {
        bear.position.set(snapshot.chaser.x, 0, snapshot.chaser.z);
        bear.rotation.y = snapshot.chaserBearing;
      }
      ctx.overlay.setDanger(snapshot.danger);
      ctx.overlay.setHud([
        '熊追来了',
        `已走 ${Math.min(steps, 70)} / 70 步`,
        `距离 ${snapshot.distance.toFixed(1)}m`,
        '加快步频或按住 W/Shift 冲出去',
      ]);
      if (snapshot.caught) {
        ctx.overlay.flashHit();
        ctx.audio.hit();
        resetStage(ctx);
      } else if (steps >= 70) {
        ctx.transitionTo('ending');
      }
    },
    exit(ctx: SceneContext): void {
      if (group) {
        ctx.scene.remove(group);
        disposeObject(group);
        group = null;
        bear = null;
      }
      ctx.scene.fog = null;
      ctx.overlay.setDanger(0);
    },
  };
})();
