import * as THREE from 'three';
import { disposeObject } from '../collision';
import type { GameStage } from '../core/game-state';
import { applyLateralMovement, applyStepMovement, resetPlayer, resolvePlayerCollisions } from '../core/movement';
import type { SceneContext } from '../core/scene-context';
import { createCaveMaze } from '../scene/cave-walls';
import { mazeLayouts, type MazeDifficulty } from '../scene/maze-grid';
import { createHandTorch, type Torch } from '../scene/torch';

export const caveMazeStage: GameStage = (() => {
  let group: THREE.Group | null = null;
  let torch: Torch | null = null;
  let ambient: THREE.AmbientLight | null = null;
  let exit = new THREE.Vector3();
  let started = false;

  function start(ctx: SceneContext, difficulty: MazeDifficulty): void {
    if (group) {
      ctx.scene.remove(group);
      disposeObject(group);
    }
    ctx.colliders.length = 0;
    const maze = createCaveMaze(mazeLayouts[difficulty]);
    group = maze.group;
    ctx.scene.add(group);
    ctx.colliders.push(...maze.colliders);
    exit = maze.exit;
    resetPlayer(ctx, maze.start, -Math.PI * 0.5);
    ctx.overlay.hidePanel();
    ctx.overlay.setHud(['山洞迷宫', 'W 或真实步伐前进，A/D 横移，拖拽鼠标看向', '寻找地上的金色出口环']);
    started = true;
  }

  return {
    enter(ctx: SceneContext): void {
      started = false;
      ctx.scene.background = new THREE.Color('#050505');
      ctx.scene.fog = new THREE.FogExp2('#050505', 0.09);
      ambient = new THREE.AmbientLight('#30251a', 0.55);
      ctx.scene.add(ambient);
      torch = createHandTorch();
      ctx.camera.add(torch.group);
      ctx.scene.add(ctx.camera);
      ctx.overlay.showChoice('选择山洞难度', [
        { label: '易', onClick: () => start(ctx, 'easy') },
        { label: '中', onClick: () => start(ctx, 'medium') },
        { label: '难', onClick: () => start(ctx, 'hard') },
      ]);
    },
    update(dt: number, ctx: SceneContext): void {
      torch?.update(performance.now() * 0.001);
      if (!started) {
        return;
      }
      applyStepMovement(ctx, ctx.player.frameSteps, 0.44);
      applyLateralMovement(ctx, dt);
      resolvePlayerCollisions(ctx);
      const distanceToExit = ctx.camera.position.distanceTo(exit);
      ctx.overlay.setHud([
        '山洞迷宫',
        `出口距离 ${distanceToExit.toFixed(1)}m`,
        '双击画面可锁定鼠标',
      ]);
      if (distanceToExit < 1.15) {
        ctx.transitionTo('narration-1');
      }
    },
    exit(ctx: SceneContext): void {
      if (group) {
        ctx.scene.remove(group);
        disposeObject(group);
        group = null;
      }
      if (torch) {
        ctx.camera.remove(torch.group);
        disposeObject(torch.group);
        torch = null;
      }
      if (ambient) {
        ctx.scene.remove(ambient);
        ambient = null;
      }
      ctx.scene.fog = null;
      started = false;
    },
  };
})();
