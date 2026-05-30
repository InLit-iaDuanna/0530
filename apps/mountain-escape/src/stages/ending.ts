import type { GameStage } from '../core/game-state';
import type { SceneContext } from '../core/scene-context';

export const endingStage: GameStage = {
  enter(ctx: SceneContext): void {
    ctx.overlay.setHud([]);
    ctx.overlay.setDanger(0);
    ctx.audio.stopGuide();
    ctx.firstPerson.setEnabled(false);
    ctx.overlay.showStory(
      '你走出了山林',
      [
        '天边露出灰白色的光。少年冲出最后一排树影，脚下终于踩回了潮湿的山路。',
        '远处有人喊他的名字，羊铃声也重新响了起来。',
      ],
      [{ label: '重新开始', onClick: () => ctx.restart() }],
    );
  },
  update(): void {},
  exit(ctx: SceneContext): void {
    ctx.firstPerson.setEnabled(true);
    ctx.overlay.hidePanel();
  },
};
