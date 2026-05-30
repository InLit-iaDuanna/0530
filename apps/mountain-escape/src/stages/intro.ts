import type { GameStage } from '../core/game-state';
import type { SceneContext } from '../core/scene-context';

export const introStage: GameStage = {
  enter(ctx: SceneContext): void {
    ctx.firstPerson.setEnabled(false);
    ctx.overlay.setHud([]);
    ctx.overlay.setDanger(0);
    ctx.scene.background = null;
    ctx.scene.fog = null;
    ctx.overlay.showStory(
      '山林逃亡',
      [
        '十七岁的少年赶着羊群穿过山腰，薄雾把熟悉的小路一点点吞没。',
        '等他发现石碑上写着禁入时，天已经暗了。身后的林子里传来低沉的响动。',
      ],
      [
        {
          label: '开始',
          onClick: async () => {
            await Promise.allSettled([ctx.audio.unlock(), ctx.pedometer.requestPermission()]);
            ctx.transitionTo('cave-maze');
          },
        },
      ],
    );
  },
  update(): void {},
  exit(ctx: SceneContext): void {
    ctx.overlay.hidePanel();
    ctx.firstPerson.setEnabled(true);
  },
};
