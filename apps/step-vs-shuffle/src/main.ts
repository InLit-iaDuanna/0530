import { evaluateImuRules } from './classifier/hard-rules';
import { applyHealthAssistance } from './classifier/healthkit';
import { KnnModel } from './classifier/knn';
import { StatefulClassifier } from './classifier/state';
import type { CalibrationSample } from './classifier/normalize';
import { extract } from './features/extractor';
import { WindowBuffer, project, type ProjectedSample } from './features/window';
import {
  CALIBRATION_STEPS,
  FEATURE_NAMES,
  IMU_RULES,
  KNN_K,
  WINDOW_DURATION_MS,
  type Label,
} from './lib/constants';
import { clearCalibration, loadCalibration, saveCalibration } from './lib/storage';
import type { MotionSample, SensorStatus } from './lib/types';
import { hasHealthBridge, readHealthStepDelta } from './sensors/health-bridge';
import { MotionSource } from './sensors/motion-source';
import { CalibrationController, LABEL_COPY, STEP_COPY } from './ui/calibration';
import { ChartRenderer } from './ui/chart';

interface AppState {
  mode: 'pre-permission' | 'calibrating' | 'live' | 'error';
  sensor: SensorStatus;
  errorMessage?: string;
  lastFeatures: readonly number[];
  lastClassification: { label: Label; confidence: number; source: string; reason?: string };
  stableLabel: Label;
  stableSinceMs: number;
  healthAvailable: boolean;
  healthSteps: number;
}

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root');
}

const state: AppState = {
  mode: 'pre-permission',
  sensor: 'idle',
  lastFeatures: new Array<number>(FEATURE_NAMES.length).fill(0),
  lastClassification: { label: 'other', confidence: 0, source: 'fallback' },
  stableLabel: 'other',
  stableSinceMs: 0,
  healthAvailable: hasHealthBridge(),
  healthSteps: 0,
};

const calibration = new CalibrationController();
const buffer = new WindowBuffer(WINDOW_DURATION_MS);
let knn: KnnModel | null = null;
let classifier: StatefulClassifier | null = null;
let chart: ChartRenderer | null = null;
let lastInferenceAt = 0;
let inferenceSeq = 0;
const stored = loadCalibration();

const motion = new MotionSource({
  onSample: handleSample,
  onStatus: handleSensorStatus,
});

if (stored.length >= KNN_K) {
  calibration.load(stored);
  initializeModel(stored);
  state.mode = 'live';
}

if (motion.getStatus() === 'unsupported') {
  state.mode = 'error';
  state.errorMessage = '当前浏览器不支持 DeviceMotion 传感器。请用最新版 Safari (iOS) 或 Chrome (Android)。';
} else if (motion.getStatus() === 'insecure') {
  state.mode = 'error';
  state.errorMessage = '需要 HTTPS 才能读取传感器。请通过 https:// 打开本页面。';
}

render();
requestAnimationFrame(loop);

function loop(): void {
  if (chart) {
    chart.draw();
  }
  requestAnimationFrame(loop);
}

function handleSensorStatus(status: SensorStatus): void {
  state.sensor = status;
  if (status === 'denied') {
    state.mode = 'error';
    state.errorMessage = '用户拒绝了传感器权限。重新打开页面再试。';
  }
  render();
}

function handleSample(sample: MotionSample): void {
  if (state.mode === 'calibrating') {
    calibration.ingest(sample);
    const calState = calibration.state(sample.t);
    if (calState.phase === 'done') {
      saveCalibration(calState.samples);
      initializeModel(calState.samples);
      state.mode = 'live';
      buffer.reset();
    }
    render();
    return;
  }

  if (state.mode === 'live') {
    const projected = buffer.push(sample);
    pushToChart(projected);

    if (sample.t - lastInferenceAt >= 200 && classifier) {
      const features = extract(buffer.snapshot());
      if (features.some((v) => v !== 0)) {
        state.lastFeatures = features;
        void classifyCurrentWindow(features, sample.t);
      }
      lastInferenceAt = sample.t;
    }
  }
}

function pushToChart(sample: ProjectedSample): void {
  if (!chart) {
    return;
  }
  const imuLabel = evaluateImuRules(state.lastFeatures).label;
  chart.push({ t: sample.t, value: sample.aHorz, mark: imuLabel === 'smallWalk' });
}

async function classifyCurrentWindow(features: readonly number[], sampleTime: number): Promise<void> {
  if (!classifier) {
    return;
  }

  const seq = (inferenceSeq += 1);
  const result = classifier.classify(features, { now: sampleTime });
  let classification = result.classification;

  const endMs = Date.now();
  const health = await readHealthStepDelta(endMs - 6000, endMs);
  if (seq !== inferenceSeq) {
    return;
  }

  classification = applyHealthAssistance(classification, health);
  state.healthAvailable = health.available;
  state.healthSteps = health.steps;
  const nextClassification: AppState['lastClassification'] = {
    label: classification.label,
    confidence: classification.confidence,
    source: classification.source,
  };
  if (classification.reason) {
    nextClassification.reason = classification.reason;
  }
  state.lastClassification = nextClassification;
  state.stableLabel = result.state.stableLabel;
  state.stableSinceMs = result.state.stableSinceMs;
  renderLive();
}

function initializeModel(samples: readonly CalibrationSample[]): void {
  knn = new KnnModel(samples);
  classifier = new StatefulClassifier(knn);
  classifier.reset(performance.now());
}

function render(): void {
  if (state.mode === 'error') {
    renderError();
    return;
  }
  if (state.mode === 'pre-permission') {
    renderPrePermission();
    return;
  }
  if (state.mode === 'calibrating') {
    renderCalibrating();
    return;
  }
  renderLive();
}

function renderError(): void {
  if (!root) {
    return;
  }
  root.innerHTML = '';
  const screen = document.createElement('section');
  screen.className = 'screen error-screen';
  screen.innerHTML = `
    <h2>无法启动传感器</h2>
    <p>${escapeHtml(state.errorMessage ?? '未知错误')}</p>
  `;
  root.appendChild(screen);
}

function renderPrePermission(): void {
  if (!root) {
    return;
  }
  root.innerHTML = '';
  const screen = document.createElement('section');
  screen.className = 'screen calibration-screen';
  screen.innerHTML = `
    <header class="app-header">
      <h1>小步走识别</h1>
      <p>手持手机识别小步走，同时把静止、晃手机和其他动作归为其他。</p>
    </header>

    <article class="calibration-step">
      <h2>开始之前</h2>
      <p class="instruction">点击"开始标定"，授权传感器后做 3 段动作：静止 5 秒、小步走 8 秒、手动伪造 8 秒。HealthKit 如由 iOS 壳提供，会作为辅助校验。</p>
      <div class="row">
        <button class="button primary" id="btn-start">开始标定</button>
        ${
          stored.length >= KNN_K
            ? '<button class="button" id="btn-skip">跳过 (用上次结果)</button>'
            : ''
        }
      </div>
      <div class="status-bar">
        <span class="status-pill">传感器: ${escapeHtml(state.sensor)}</span>
      </div>
    </article>
  `;
  root.appendChild(screen);

  const startBtn = document.getElementById('btn-start');
  if (startBtn) {
    startBtn.addEventListener('click', startCalibration);
  }
  const skipBtn = document.getElementById('btn-skip');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      state.mode = 'live';
      render();
    });
  }
}

async function startCalibration(): Promise<void> {
  const status = await motion.start();
  if (status !== 'active') {
    return;
  }
  calibration.start(performance.now());
  state.mode = 'calibrating';
  render();
}

function renderCalibrating(): void {
  if (!root) {
    return;
  }
  const calState = calibration.state(performance.now());

  if (calState.phase === 'between' && calState.currentIndex < CALIBRATION_STEPS.length) {
    const nextStep = CALIBRATION_STEPS[calState.currentIndex];
    if (!nextStep) {
      return;
    }
    const copy = STEP_COPY[nextStep.key];

    root.innerHTML = '';
    const screen = document.createElement('section');
    screen.className = 'screen calibration-screen';
    screen.innerHTML = `
      <header class="app-header">
        <h1>第 ${calState.currentIndex + 1} / ${CALIBRATION_STEPS.length} 段</h1>
      </header>
      <article class="calibration-step" style="--badge-color:${copy.color}">
        <h2>${escapeHtml(copy.title)}</h2>
        <p class="instruction">${escapeHtml(copy.instruction)}</p>
        <button class="button primary" id="btn-begin">准备好了，开始</button>
      </article>
    `;
    root.appendChild(screen);
    const beginBtn = document.getElementById('btn-begin');
    if (beginBtn) {
      beginBtn.addEventListener('click', () => {
        calibration.beginNext(performance.now());
        render();
      });
    }
    return;
  }

  const stepKey = calState.currentStepKey ?? 'still';
  const copy = STEP_COPY[stepKey];
  const fillScale = calState.durationMs > 0 ? 1 - calState.remainingMs / calState.durationMs : 0;
  const seconds = Math.ceil(calState.remainingMs / 1000);

  root.innerHTML = '';
  const screen = document.createElement('section');
  screen.className = 'screen calibration-screen';
  screen.innerHTML = `
    <header class="app-header">
      <h1>第 ${calState.currentIndex + 1} / ${CALIBRATION_STEPS.length} 段</h1>
    </header>
    <article class="calibration-step" style="--badge-color:${copy.color}">
      <h2>${escapeHtml(copy.title)}</h2>
      <p class="instruction">${escapeHtml(copy.instruction)}</p>
      <div class="timer">${seconds}</div>
      <div class="progress">
        <div class="progress-fill" style="transform: scaleX(${fillScale.toFixed(3)})"></div>
      </div>
      <div class="row">
        <button class="button" id="btn-redo">重录</button>
      </div>
    </article>
  `;
  root.appendChild(screen);
  const redoBtn = document.getElementById('btn-redo');
  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      calibration.redoCurrent(performance.now());
      render();
    });
  }
}

function renderLive(): void {
  if (!root) {
    return;
  }
  const existing = root.querySelector('.live-screen');
  if (!existing) {
    root.innerHTML = '';
    const screen = document.createElement('section');
    screen.className = 'screen live-screen';
    screen.innerHTML = `
      <header class="app-header">
        <h1>实时识别</h1>
        <div class="status-bar">
          <span class="status-pill" data-sensor>传感器: ${escapeHtml(state.sensor)}</span>
          <span class="status-pill" data-source>—</span>
          <span class="status-pill" data-samples>—</span>
        </div>
      </header>
      <article class="badge" data-badge>
        <span class="label" data-label>—</span>
        <span class="meta" data-meta>—</span>
      </article>
      <article class="card">
        <h3 class="card-title">水平运动强度 (实时)</h3>
        <div class="chart"><canvas data-canvas></canvas></div>
      </article>
      <article class="card">
        <h3 class="card-title">特征值</h3>
        <div class="feature-grid" data-features></div>
      </article>
      <div class="row">
        <button class="button" data-action="recal">重新标定</button>
        <button class="button danger" data-action="reset">清除并重启</button>
      </div>
    `;
    root.appendChild(screen);

    const canvas = screen.querySelector<HTMLCanvasElement>('[data-canvas]');
    if (canvas) {
      chart = new ChartRenderer(canvas);
    }
    screen.querySelector<HTMLButtonElement>('[data-action="recal"]')?.addEventListener('click', () => {
      calibration.start(performance.now());
      state.mode = 'calibrating';
      render();
    });
    screen.querySelector<HTMLButtonElement>('[data-action="reset"]')?.addEventListener('click', () => {
      clearCalibration();
      window.location.reload();
    });
  }

  const cls = state.lastClassification;
  const copy = LABEL_COPY[state.stableLabel];
  const badge = root.querySelector<HTMLElement>('[data-badge]');
  if (badge) {
    badge.style.setProperty('--badge-color', copy.color);
    if (cls.label === 'smallWalk') {
      badge.classList.add('flash');
      setTimeout(() => badge.classList.remove('flash'), 200);
    }
  }
  setText(root, '[data-label]', copy.title);

  const stableSec = Math.max(0, (performance.now() - state.stableSinceMs) / 1000);
  setText(
    root,
    '[data-meta]',
    `稳定 ${stableSec.toFixed(1)}s · 置信 ${(cls.confidence * 100).toFixed(0)}%`,
  );
  setText(root, '[data-sensor]', `传感器: ${state.sensor}`);
  setText(
    root,
    '[data-source]',
    `判别源: ${cls.source}${cls.reason ? ` / ${cls.reason}` : ''}`,
  );
  setText(
    root,
    '[data-samples]',
    state.healthAvailable
      ? `HealthKit: 近6秒 ${state.healthSteps} 步`
      : `参考样本: ${knn?.size() ?? 0} · HealthKit未接入`,
  );

  const grid = root.querySelector<HTMLElement>('[data-features]');
  if (grid) {
    grid.innerHTML = FEATURE_NAMES.map((name, i) => {
      const value = state.lastFeatures[i] ?? 0;
      const flagged = thresholdHit(name, value);
      return `
        <div class="feature-row ${flagged ? 'threshold-hit' : ''}">
          <span class="name">${name}</span>
          <span class="value">${formatValue(value)}</span>
        </div>
      `;
    }).join('');
  }
}

function thresholdHit(name: (typeof FEATURE_NAMES)[number], value: number): boolean {
  if (name === 'dominantFreqVert') {
    return value >= IMU_RULES.cadenceMinHz && value <= IMU_RULES.cadenceMaxHz;
  }
  if (name === 'vertRatio') {
    return value >= IMU_RULES.smallWalkVertRatioMin && value <= IMU_RULES.smallWalkVertRatioMax;
  }
  if (name === 'spectralEntropy') {
    return value <= IMU_RULES.spectralEntropyMax;
  }
  return false;
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 100) {
    return v.toFixed(0);
  }
  if (Math.abs(v) >= 10) {
    return v.toFixed(1);
  }
  return v.toFixed(2);
}

function setText(parent: ParentNode, selector: string, text: string): void {
  const el = parent.querySelector(selector);
  if (el) {
    el.textContent = text;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === '&') return '&amp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    if (c === '"') return '&quot;';
    return '&#39;';
  });
}
