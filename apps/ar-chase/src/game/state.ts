export type GameState =
  | 'boot'
  | 'permission'
  | 'ready'
  | 'playing'
  | 'caught'
  | 'degraded_no_camera'
  | 'degraded_no_motion';

export type GameStateListener = (state: GameState) => void;

export class StateMachine {
  private state: GameState = 'boot';
  private readonly listeners = new Set<GameStateListener>();

  get value(): GameState {
    return this.state;
  }

  setState(next: GameState): void {
    if (this.state === next) {
      return;
    }

    this.state = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
}
