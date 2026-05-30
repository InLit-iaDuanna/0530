import type { GameState } from '../game/state';
import { formatScore } from '../game/score';

export interface OverlayActions {
  onStart: () => void;
  onRestart: () => void;
}

export class Overlay {
  readonly root: HTMLDivElement;
  readonly sceneHost: HTMLDivElement;
  readonly joystickPad: HTMLDivElement;
  readonly forwardButton: HTMLButtonElement;
  private readonly panel: HTMLDivElement;
  private readonly hud: HTMLDivElement;
  private readonly timeEl: HTMLDivElement;
  private readonly dangerEl: HTMLDivElement;
  private readonly distanceEl: HTMLDivElement;
  private readonly messageEl: HTMLDivElement;
  private countdownTimer = 0;

  constructor(app: HTMLElement, actions: OverlayActions) {
    this.root = document.createElement('div');
    this.root.className = 'ar-app';
    this.root.innerHTML = `
      <div class="scene-host"></div>
      <div class="hud" aria-live="polite">
        <div class="score">00:00</div>
        <div class="danger"><span></span></div>
        <div class="distance">12.0m</div>
      </div>
      <div class="panel">
        <p class="eyebrow">Web AR Chase</p>
        <h1>别被追上</h1>
        <p class="copy">需要摄像头与运动权限。移动手机、转身、原地踏步来拉开距离。</p>
        <button class="primary" type="button">开始体验</button>
        <button class="secondary" type="button">再来一次</button>
      </div>
      <div class="message"></div>
      <button class="forward" type="button" aria-label="前进">↑</button>
      <div class="joystick" aria-hidden="true"><span></span></div>
    `;
    app.appendChild(this.root);

    this.sceneHost = this.root.querySelector('.scene-host')!;
    this.panel = this.root.querySelector('.panel')!;
    this.hud = this.root.querySelector('.hud')!;
    this.timeEl = this.root.querySelector('.score')!;
    this.dangerEl = this.root.querySelector('.danger span')!;
    this.distanceEl = this.root.querySelector('.distance')!;
    this.messageEl = this.root.querySelector('.message')!;
    this.forwardButton = this.root.querySelector('.forward')!;
    this.joystickPad = this.root.querySelector('.joystick')!;

    this.root.querySelector<HTMLButtonElement>('.primary')!.addEventListener('click', actions.onStart);
    this.root.querySelector<HTMLButtonElement>('.secondary')!.addEventListener('click', actions.onRestart);
  }

  setState(state: GameState): void {
    this.root.dataset.state = state;
    this.panel.classList.toggle('is-hidden', state === 'playing' || state === 'ready');
    this.hud.classList.toggle('is-visible', state === 'playing');
    this.root.classList.toggle('show-forward', state === 'playing');

    const title = this.panel.querySelector('h1')!;
    const copy = this.panel.querySelector('.copy')!;
    const primary = this.panel.querySelector<HTMLButtonElement>('.primary')!;
    const secondary = this.panel.querySelector<HTMLButtonElement>('.secondary')!;

    primary.hidden = state !== 'permission' && state !== 'boot';
    secondary.hidden = state !== 'caught';

    if (state === 'boot' || state === 'permission') {
      title.textContent = '别被追上';
      copy.textContent = window.isSecureContext
        ? '需要摄像头与运动权限。移动手机、转身、原地踏步来拉开距离。'
        : '真机测试需要 HTTPS。你仍可在桌面降级模式里试玩。';
      primary.textContent = '开始体验';
    }

    if (state === 'degraded_no_camera') {
      title.textContent = '摄像头不可用';
      copy.textContent = '已切换到黑色背景和摇杆控制，游戏仍可继续。';
    }

    if (state === 'degraded_no_motion') {
      this.flash('未检测到运动，已启用摇杆');
    }
  }

  setCaught(scoreMs: number, bestMs: number): void {
    this.setState('caught');
    const title = this.panel.querySelector('h1')!;
    const copy = this.panel.querySelector('.copy')!;
    title.textContent = '被追上了';
    copy.textContent = `本局 ${formatScore(scoreMs)} / 最佳 ${formatScore(bestMs)}`;
  }

  updateHud(scoreMs: number, danger: number, distance: number): void {
    this.timeEl.textContent = formatScore(scoreMs);
    this.dangerEl.style.transform = `scaleX(${danger})`;
    this.distanceEl.textContent = `${distance.toFixed(1)}m`;
  }

  async countdown(): Promise<void> {
    this.messageEl.classList.add('countdown');
    for (const value of ['3', '2', '1']) {
      this.messageEl.textContent = value;
      await delay(760);
    }
    this.messageEl.textContent = '';
    this.messageEl.classList.remove('countdown');
  }

  flash(message: string): void {
    window.clearTimeout(this.countdownTimer);
    this.messageEl.textContent = message;
    this.messageEl.classList.add('toast');
    this.countdownTimer = window.setTimeout(() => {
      this.messageEl.textContent = '';
      this.messageEl.classList.remove('toast');
    }, 2200);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
