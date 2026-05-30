import './ui/overlay.css';
import { createCameraStream, type CameraStream } from './bootstrap/camera-stream';
import { canUseCamera, requestMotionPermissions } from './bootstrap/permissions';
import { requestWakeLock } from './bootstrap/wake-lock';
import { ChaseAI } from './game/chase-ai';
import { ScoreTracker, readBestScore } from './game/score';
import { StateMachine } from './game/state';
import { JoystickInput } from './input/joystick';
import { MotionInput } from './input/motion';
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
const motion = new MotionInput();
const joystick = new JoystickInput(overlay.root, overlay.joystickPad);
const chase = new ChaseAI();
const score = new ScoreTracker();
const audio = new AudioFeedback();

let cameraStream: CameraStream | null = null;
let animationId = 0;
let lastFrame = performance.now();
let elapsedSeconds = 0;
let fallbackYaw = 0;
let fallbackPitch = 0;
let motionAllowed = false;
let motionWarned = false;
let controlsForced = false;

state.subscribe((next) => {
  overlay.setState(next);
  setCaughtEffect(overlay.root, next === 'caught');
  joystick.setVisible(
    next === 'degraded_no_motion' ||
      next === 'degraded_no_camera' ||
      (controlsForced && next === 'playing'),
  );
});
state.setState('permission');
renderer.setFallbackBackground();
chase.reset();
overlay.updateHud(0, 0, 12);

async function startExperience(): Promise<void> {
  void audio.start();
  void requestWakeLock();

  try {
    motionAllowed = await requestMotionPermissions();
  } catch {
    motionAllowed = false;
  }

  if (!canUseCamera()) {
    controlsForced = true;
    state.setState('degraded_no_camera');
    await beginRound();
    return;
  }

  try {
    cameraStream = await createCameraStream();
    renderer.setCameraVideo(cameraStream.video);
  } catch {
    controlsForced = true;
    state.setState('degraded_no_camera');
    renderer.setFallbackBackground();
    await beginRound();
    return;
  }

  if (!motionAllowed) {
    controlsForced = true;
    state.setState('degraded_no_motion');
  }

  await beginRound();
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
  motionWarned = false;
  fallbackYaw = 0;
  fallbackPitch = 0;
  overlay.updateHud(0, 0, 12);
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
    stepCount: input.stepCount,
    joystickForward: input.joystick.y,
  });

  const elapsedMs = score.update(now);
  renderer.chaser.update(snapshot, input.yaw, elapsedSeconds);
  renderer.render(input.yaw, input.pitch);
  overlay.updateHud(elapsedMs, snapshot.danger, snapshot.distance);
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
  const joy = joystick.snapshot();
  const steps = motionAllowed ? motion.consumeSteps() : 0;
  const hasMotion = motionAllowed && motion.hasRecentMotion(now);

  if (motionAllowed && !hasMotion && now - lastFrame > 0 && elapsedSeconds > 4 && !motionWarned) {
    motionWarned = true;
    controlsForced = true;
    state.setState('degraded_no_motion');
    overlay.flash('未检测到运动，已启用摇杆');
  }

  fallbackYaw += joy.lookYaw + joy.x * 0.025;
  fallbackPitch = Math.max(-0.65, Math.min(0.65, fallbackPitch + joy.lookPitch));

  const yaw = orient.active ? orient.yaw : fallbackYaw;
  const pitch = orient.active ? orient.pitch : fallbackPitch;
  let source: InputFrame['source'] = 'none';

  if (steps > 0 && joy.active) source = 'mixed';
  else if (steps > 0) source = 'motion';
  else if (joy.active) source = 'joystick';

  return {
    yaw,
    pitch,
    stepCount: steps,
    joystick: {
      x: joy.x,
      y: joy.y,
    },
    source,
  };
}
