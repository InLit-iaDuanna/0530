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
  private readonly trackerEl: HTMLDivElement;
  private readonly trackerLabelEl: HTMLSpanElement;
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
        <div class="distance">14.0m</div>
      </div>
      <div class="tracker" aria-live="polite">
        <span class="tracker-arrow">↑</span>
        <span class="tracker-label">身后 14.0m</span>
      </div>
      <div class="panel">
        <p class="eyebrow">Room Chase</p>
        <h1>别被追上</h1>
        <p class="copy">一个大房间里的第一人称追逐。看方向标，转身确认追逐者位置，按住前进逃跑。</p>
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
    this.trackerEl = this.root.querySelector('.tracker')!;
    this.trackerLabelEl = this.root.querySelector('.tracker-label')!;
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
    this.root.classList.toggle('show-tracker', state === 'playing');

    const title = this.panel.querySelector('h1')!;
    const copy = this.panel.querySelector('.copy')!;
    const primary = this.panel.querySelector<HTMLButtonElement>('.primary')!;
    const secondary = this.panel.querySelector<HTMLButtonElement>('.secondary')!;

    primary.hidden = state !== 'permission' && state !== 'boot';
    secondary.hidden = state !== 'caught';

    if (state === 'boot' || state === 'permission') {
      title.textContent = '别被追上';
      copy.textContent = '一个大房间里的第一人称追逐。看方向标，转身确认追逐者位置，按住前进逃跑。';
      primary.textContent = '开始体验';
    }

    if (state === 'degraded_no_camera') {
      title.textContent = '简化控制';
      copy.textContent = '当前环境不完整，已切换到简化控制方式。';
    }

    if (state === 'degraded_no_motion') {
      this.flash('已启用简化控制');
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

  updateTracker(relativeBearing: number, distance: number, danger: number): void {
    this.trackerEl.style.setProperty('--tracker-angle', `${-relativeBearing}rad`);
    this.trackerEl.style.setProperty('--tracker-danger', `${danger}`);
    this.trackerLabelEl.textContent = `${bearingLabel(relativeBearing)} ${distance.toFixed(1)}m`;
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

function bearingLabel(angle: number): string {
  const abs = Math.abs(angle);
  if (abs < Math.PI / 5) return '前方';
  if (abs > (Math.PI * 4) / 5) return '身后';
  return angle > 0 ? '左侧' : '右侧';
}
