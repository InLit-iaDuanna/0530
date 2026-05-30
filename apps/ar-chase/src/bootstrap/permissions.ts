export interface PermissionResult {
  cameraGranted: boolean;
  motionGranted: boolean;
  cameraError?: Error;
  motionError?: Error;
}

type RequestPermissionEvent = EventTarget & {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

export async function requestMotionPermissions(): Promise<boolean> {
  const motionEvent = DeviceMotionEvent as unknown as RequestPermissionEvent | undefined;
  const orientationEvent = DeviceOrientationEvent as unknown as RequestPermissionEvent | undefined;

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
