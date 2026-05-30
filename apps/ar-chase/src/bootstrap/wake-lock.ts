type WakeLockSentinel = EventTarget & {
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
};

export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  const wakeLock = (navigator as WakeLockNavigator).wakeLock;

  if (!wakeLock) {
    return null;
  }

  try {
    return await wakeLock.request('screen');
  } catch {
    return null;
  }
}
