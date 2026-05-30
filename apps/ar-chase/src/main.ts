import './ui/overlay.css';
import { requestOrientationPermission } from './bootstrap/permissions';
import { requestWakeLock } from './bootstrap/wake-lock';
import { ChaseAI, DEFAULT_CHASE_CONFIG } from './game/chase-ai';
import { ScoreTracker, readBestScore } from './game/score';
import { StateMachine } from './game/state';
import { ForwardInput } from './input/forward';
import { JoystickInput } from './input/joystick';
import { OrientationInput } from './input/orientation';
import type { InputFrame } from './input/types';
import { setCaughtEffect } from './scene/postfx';
import { GameRenderer } from './scene/renderer';
import { Overlay } from './ui/overlay';

class AudioFeedback {
  private context: AudioContext | null = null;
  private heartbeat: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  async start(): Promise<void> {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    this.context ??= new AudioContextCtor();
    await this.context.resume();

    if (!this.heartbeat) {
      this.heartbeat = this.context.createOscillator();
      this.gain = this.context.createGain();
      this.heartbeat.type = 'sine';
      this.heartbeat.frequency.value = 48;
      this.gain.gain.value = 0;
      this.heartbeat.connect(this.gain);
      this.gain.connect(this.context.destination);
      this.heartbeat.start();
    }
  }

  update(danger: number): void {
    if (!this.gain || !this.heartbeat || !this.context) {
      return;
    }

    const now = this.context.currentTime;
    this.heartbeat.frequency.setTargetAtTime(46 + danger * 34, now, 0.06);
    this.gain.gain.setTargetAtTime(0.02 + danger * 0.08, now, 0.08);
  }

  stop(): void {
    if (!this.gain || !this.context) {
      return;
    }

    this.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('App root missing.');
}

const state = new StateMachine();
const overlay = new Overlay(app, {
  onStart: () => void startExperience(),
  onRestart: () => void restart(),
});
const renderer = new GameRenderer(overlay.sceneHost);
const orientation = new OrientationInput();
const forward = new ForwardInput(overlay.forwardButton);
const joystick = new JoystickInput(overlay.root, overlay.joystickPad);
const chase = new ChaseAI();
const score = new ScoreTracker();
const audio = new AudioFeedback();

let animationId = 0;
let lastFrame = performance.now();
let elapsedSeconds = 0;
let fallbackYaw = 0;
let fallbackPitch = 0;

state.subscribe((next) => {
  overlay.setState(next);
  setCaughtEffect(overlay.root, next === 'caught');
  joystick.setVisible(next === 'playing');
});
chase.reset();
overlay.updateHud(0, 0, DEFAULT_CHASE_CONFIG.INITIAL_DISTANCE);
overlay.updateTracker(Math.PI, DEFAULT_CHASE_CONFIG.INITIAL_DISTANCE, 0);

async function startExperience(): Promise<void> {
  void audio.start();
  void requestWakeLock();
  const orientationAllowed = await requestOrientationPermission().catch(() => false);
  await beginRound();
  if (!orientationAllowed) {
    overlay.flash('可拖动右侧转身');
  }
}

async function restart(): Promise<void> {
  setCaughtEffect(overlay.root, false);
  await beginRound();
}

async function beginRound(): Promise<void> {
  cancelAnimationFrame(animationId);
  state.setState('ready');
  chase.reset();
  orientation.calibrate();
  elapsedSeconds = 0;
  fallbackYaw = 0;
  fallbackPitch = 0;
  overlay.updateHud(0, 0, DEFAULT_CHASE_CONFIG.INITIAL_DISTANCE);
  overlay.updateTracker(Math.PI, DEFAULT_CHASE_CONFIG.INITIAL_DISTANCE, 0);
  await overlay.countdown();
  score.start();
  lastFrame = performance.now();
  state.setState('playing');
  animationId = requestAnimationFrame(tick);
}

function tick(now: number): void {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  const input = readInput(now);
  elapsedSeconds += dt;
  const snapshot = chase.update({
    dt,
    elapsed: elapsedSeconds,
    playerYaw: input.yaw,
    forwardAxis: input.forwardHeld ? 1 : Math.max(0, input.joystick.y),
    stepCount: input.stepCount,
  });

  const elapsedMs = score.update(now);
  renderer.chaser.update(snapshot, input.yaw, elapsedSeconds);
  renderer.render(snapshot, input.yaw, input.pitch);
  overlay.updateHud(elapsedMs, snapshot.danger, snapshot.distance);
  overlay.updateTracker(normalizeAngle(snapshot.chaserBearing - input.yaw), snapshot.distance, snapshot.danger);
  audio.update(snapshot.danger);

  if (snapshot.caught) {
    const best = score.commitBest();
    audio.stop();
    overlay.setCaught(score.elapsed, best || readBestScore());
    cancelAnimationFrame(animationId);
    return;
  }

  animationId = requestAnimationFrame(tick);
}

function readInput(now: number): InputFrame {
  const orient = orientation.snapshot();
  const forwardInput = forward.snapshot();
  const joy = joystick.snapshot();

  fallbackYaw += joy.lookYaw - joy.x * 0.025;
  fallbackPitch = Math.max(-0.65, Math.min(0.65, fallbackPitch + joy.lookPitch));

  const yaw = orient.active ? orient.yaw : fallbackYaw;
  const pitch = orient.active ? orient.pitch : fallbackPitch;
  let source: InputFrame['source'] = 'none';
  const forwardHeld = forwardInput.held || joy.y > 0.05;

  if (forwardInput.keyboard) source = 'keyboard';
  else if (forwardHeld) source = 'forward';
  else if (joy.active) source = 'joystick';

  return {
    yaw,
    pitch,
    forwardHeld,
    stepCount: 0,
    joystick: {
      x: joy.x,
      y: joy.y,
    },
    source,
  };
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
