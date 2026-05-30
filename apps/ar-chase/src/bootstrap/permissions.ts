export interface PermissionResult {
  cameraGranted: boolean;
  motionGranted: boolean;
  cameraError?: Error;
  motionError?: Error;
}

type RequestPermissionEvent = EventTarget & {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

function getPermissionEvent(name: 'DeviceMotionEvent' | 'DeviceOrientationEvent'): RequestPermissionEvent | undefined {
  const scope = globalThis as unknown as Record<string, unknown>;
  return scope[name] as RequestPermissionEvent | undefined;
}

export async function requestOrientationPermission(): Promise<boolean> {
  const orientationEvent = getPermissionEvent('DeviceOrientationEvent');

  if (typeof orientationEvent?.requestPermission !== 'function') {
    return true;
  }

  const result = await orientationEvent.requestPermission();
  return result === 'granted';
}

export async function requestMotionPermissions(): Promise<boolean> {
  const motionEvent = getPermissionEvent('DeviceMotionEvent');
  const orientationEvent = getPermissionEvent('DeviceOrientationEvent');

  const requests: Array<Promise<'granted' | 'denied' | 'default'>> = [];

  if (typeof motionEvent?.requestPermission === 'function') {
    requests.push(motionEvent.requestPermission());
  }

  if (typeof orientationEvent?.requestPermission === 'function') {
    requests.push(orientationEvent.requestPermission());
  }

  if (requests.length === 0) {
    return true;
  }

  const results = await Promise.all(requests);
  return results.every((result) => result === 'granted');
}

export function canUseCamera(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function needsSecureContext(): boolean {
  return !window.isSecureContext;
}
