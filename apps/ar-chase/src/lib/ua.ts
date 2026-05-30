export type Platform = 'ios' | 'android' | 'desktop';

export function detectPlatform(userAgent = navigator.userAgent): Platform {
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    return 'ios';
  }

  if (/Android/.test(userAgent)) {
    return 'android';
  }

  return 'desktop';
}

export function supportsTouch(): boolean {
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}
