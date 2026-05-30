import type { GameStage } from '../core/game-state';
import type { SceneContext, StageKey } from '../core/scene-context';

export function createNarrationStage(title: string, lines: string[], next: StageKey): GameStage {
  let elapsed = 0;
  let ready = false;

  return {
    enter(ctx: SceneContext): void {
      elapsed = 0;
      ready = false;
      ctx.overlay.setHud([]);
      ctx.overlay.setDanger(0);
      ctx.overlay.showStory(title, lines, [
        {
          label: '继续',
          onClick: () => ctx.transitionTo(next),
        },
      ]);
    },
    update(dt: number, ctx: SceneContext): void {
      elapsed += dt;
      if (!ready && elapsed > 1.35) {
        ready = true;
      }
      if (ready && ctx.player.frameSteps > 0) {
        ctx.transitionTo(next);
      }
    },
    exit(ctx: SceneContext): void {
      ctx.overlay.hidePanel();
    },
  };
}
