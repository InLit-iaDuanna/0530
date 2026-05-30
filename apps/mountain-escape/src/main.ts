import * as THREE from 'three';
import './ui/overlay.css';
import { GameState, type GameStage } from './core/game-state';
import { FirstPersonControls } from './core/first-person';
import type { SceneContext, StageKey } from './core/scene-context';
import { KeyboardInput } from './input/keyboard';
import { Pedometer } from './input/pedometer';
import { ShakeDetector } from './input/shake-detector';
import { Overlay } from './ui/overlay';
import { Sfx } from './audio/sfx';
import { introStage } from './stages/intro';
import { caveMazeStage } from './stages/cave-maze';
import { createNarrationStage } from './stages/narration';
import { grassCutStage } from './stages/grass-cut';
import { fogWalkStage } from './stages/fog-walk';
import { bearChaseStage } from './stages/bear-chase';
import { endingStage } from './stages/ending';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const overlayRoot = document.querySelector<HTMLElement>('#overlay');

if (!canvas || !overlayRoot) {
  throw new Error('Mountain Escape requires #game-canvas and #overlay elements.');
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 220);
scene.add(camera);

const keyboard = new KeyboardInput();
const pedometer = new Pedometer();
const shake = new ShakeDetector();
const overlay = new Overlay(overlayRoot);
const firstPerson = new FirstPersonControls(canvas, camera);
const audio = new Sfx();

let gameState: GameState;

const ctx: SceneContext = {
  renderer,
  scene,
  camera,
  canvas,
  overlay,
  keyboard,
  pedometer,
  shake,
  firstPerson,
  audio,
  colliders: [],
  player: {
    frameSteps: 0,
    totalSteps: 0,
    lastCollision: false,
  },
  transitionTo(stage: StageKey): void {
    gameState.transitionTo(stage);
  },
  restart(): void {
    gameState.transitionTo('intro');
  },
};

const stages: Record<StageKey, GameStage> = {
  intro: introStage,
  'cave-maze': caveMazeStage,
  'narration-1': createNarrationStage(
    '洞口外的风',
    ['少年钻出山洞，发现羊群早已不见。脚下只有被草盖住的小径，还在往更深处延伸。'],
    'grass-cut',
  ),
  'grass-cut': grassCutStage,
  'narration-2': createNarrationStage(
    '草后的雾',
    ['草丛被割开后，前方的树林忽然安静下来。雾里传来水声，也传来像鸟一样短促的叫声。'],
    'fog-walk',
  ),
  'fog-walk': fogWalkStage,
  'narration-3': createNarrationStage(
    '脚印',
    ['雾淡下去时，泥地上出现一串新鲜的脚印。它们比人的脚掌宽得多，正朝同一个方向延伸。'],
    'bear-chase',
  ),
  'bear-chase': bearChaseStage,
  ending: endingStage,
};

gameState = new GameState(ctx, stages);

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);

let previous = performance.now();
function animate(now: number): void {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;

  keyboard.update(dt);
  const frameSteps = keyboard.consumeSteps() + pedometer.consumeSteps();
  ctx.player.frameSteps = frameSteps;
  ctx.player.totalSteps += frameSteps;

  gameState.update(dt);
  overlay.update(dt);
  renderer.render(scene, camera);
}

resize();
gameState.start('intro');
renderer.setAnimationLoop(animate);
