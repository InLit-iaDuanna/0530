import * as THREE from 'three';
import type { CircleCollider } from '../collision';
import type { KeyboardInput } from '../input/keyboard';
import type { Pedometer } from '../input/pedometer';
import type { ShakeDetector } from '../input/shake-detector';
import type { Sfx } from '../audio/sfx';
import type { FirstPersonControls } from './first-person';
import type { Overlay } from '../ui/overlay';

export interface PlayerState {
  frameSteps: number;
  totalSteps: number;
  lastCollision: boolean;
}

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  overlay: Overlay;
  keyboard: KeyboardInput;
  pedometer: Pedometer;
  shake: ShakeDetector;
  firstPerson: FirstPersonControls;
  audio: Sfx;
  colliders: CircleCollider[];
  player: PlayerState;
  transitionTo(stage: StageKey): void;
  restart(): void;
}

export type StageKey =
  | 'intro'
  | 'cave-maze'
  | 'narration-1'
  | 'grass-cut'
  | 'narration-2'
  | 'fog-walk'
  | 'narration-3'
  | 'bear-chase'
  | 'ending';
