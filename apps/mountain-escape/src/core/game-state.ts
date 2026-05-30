import type { SceneContext, StageKey } from './scene-context';

export interface GameStage {
  enter(ctx: SceneContext): void;
  update(dt: number, ctx: SceneContext): void;
  exit(ctx: SceneContext): void;
}

export class GameState {
  private activeKey: StageKey = 'intro';
  private activeStage: GameStage | null = null;

  constructor(
    private readonly ctx: SceneContext,
    private readonly stages: Record<StageKey, GameStage>,
  ) {}

  start(stage: StageKey = 'intro'): void {
    this.transitionTo(stage);
  }

  transitionTo(stage: StageKey): void {
    this.activeStage?.exit(this.ctx);
    this.ctx.colliders.length = 0;
    this.ctx.player.frameSteps = 0;
    this.activeKey = stage;
    this.activeStage = this.stages[stage];
    this.activeStage.enter(this.ctx);
  }

  update(dt: number): void {
    this.activeStage?.update(dt, this.ctx);
  }

  key(): StageKey {
    return this.activeKey;
  }
}
