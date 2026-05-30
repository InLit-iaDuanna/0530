export interface CameraStream {
  video: HTMLVideoElement;
  stream: MediaStream;
  stop: () => void;
}

export async function createCameraStream(timeoutMs = 3500): Promise<CameraStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not available in this browser.');
  }

  const stream = await withTimeout(
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    }),
    timeoutMs,
  );

  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = true;
  video.autoplay = true;
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');

  await video.play();

  return {
    video,
    stream,
    stop: () => {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    },
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Camera permission timed out.'));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}
