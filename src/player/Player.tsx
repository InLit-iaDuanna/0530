import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CapsuleCollider, RapierRigidBody, RigidBody } from '@react-three/rapier';
import { Euler, MathUtils, Vector3 } from 'three';
import { Controls } from '../app/App';
import { gridToWorld, MazeLayout } from '../maze/layout';
import { consumeTouchLookDelta, getSensorMoveState, getTouchMove } from './usePlayerInput';
import { useKeyboardControls } from '../controls/keyboard';

interface PlayerProps {
  readonly layout: MazeLayout;
  readonly resetSignal: number;
  readonly useTouchLook: boolean;
  readonly useSensorControl: boolean;
  readonly enabled: boolean;
}

const UP = new Vector3(0, 1, 0);
const START_YAW = -Math.PI / 2;
const EYE_HEIGHT = 1.45;
const MOVE_SPEED = 3.2;
const LOOK_SENSITIVITY = 0.0036;

export const Player = ({
  layout,
  resetSignal,
  useTouchLook,
  useSensorControl,
  enabled,
}: PlayerProps): JSX.Element => {
  const bodyRef = useRef<RapierRigidBody>(null);
  const yawRef = useRef(START_YAW);
  const pitchRef = useRef(0);
  const getKeyboard = useKeyboardControls<Controls>();
  const { camera } = useThree();
  const startPosition = useMemo(() => gridToWorld(layout, layout.start, 0.1), [layout]);
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const movement = useMemo(() => new Vector3(), []);
  const cameraEuler = useMemo(() => new Euler(0, START_YAW, 0, 'YXZ'), []);

  useEffect(() => {
    const body = bodyRef.current;

    yawRef.current = START_YAW;
    pitchRef.current = 0;
    camera.rotation.set(0, START_YAW, 0, 'YXZ');

    if (!body) {
      return;
    }

    body.setTranslation({ x: startPosition[0], y: startPosition[1], z: startPosition[2] }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }, [camera, resetSignal, startPosition]);

  useFrame(() => {
    const body = bodyRef.current;

    if (!body) {
      return;
    }

    if (useSensorControl) {
      const sensor = getSensorMoveState();
      yawRef.current = sensor.yaw;
      pitchRef.current = sensor.pitch;
      cameraEuler.set(pitchRef.current, yawRef.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(cameraEuler);
    } else if (useTouchLook) {
      const delta = consumeTouchLookDelta();
      yawRef.current -= delta.x * LOOK_SENSITIVITY;
      pitchRef.current = MathUtils.clamp(
        pitchRef.current - delta.y * LOOK_SENSITIVITY,
        -1.25,
        1.25,
      );
      cameraEuler.set(pitchRef.current, yawRef.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(cameraEuler);
    }

    const keyboard = getKeyboard();
    const touch = getTouchMove();
    const sensor = getSensorMoveState();
    const keyboardX = Number(keyboard.right) - Number(keyboard.left);
    const keyboardY = Number(keyboard.forward) - Number(keyboard.backward);
    const inputX = useSensorControl ? 0 : MathUtils.clamp(keyboardX + touch.x, -1, 1);
    const inputY = useSensorControl ? 1 : MathUtils.clamp(keyboardY + touch.y, -1, 1);
    const moveSpeed = useSensorControl ? sensor.forwardSpeed : MOVE_SPEED;
    const currentVelocity = body.linvel();

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, UP).normalize();

    movement.set(0, 0, 0);
    movement.addScaledVector(forward, inputY);
    movement.addScaledVector(right, inputX);

    if (movement.lengthSq() > 1) {
      movement.normalize();
    }

    if (enabled) {
      body.setLinvel(
        {
          x: movement.x * moveSpeed,
          y: currentVelocity.y,
          z: movement.z * moveSpeed,
        },
        true,
      );
    } else {
      body.setLinvel({ x: 0, y: currentVelocity.y, z: 0 }, true);
    }

    const translation = body.translation();
    camera.position.set(translation.x, translation.y + EYE_HEIGHT, translation.z);
  });

  return (
    <RigidBody
      ref={bodyRef}
      position={startPosition}
      colliders={false}
      enabledRotations={[false, false, false]}
      linearDamping={8}
      angularDamping={8}
      ccd
    >
      <CapsuleCollider args={[0.5, 0.3]} position={[0, 0.8, 0]} />
    </RigidBody>
  );
};