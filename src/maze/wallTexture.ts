import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three';

export const createWallTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  const size = 256;
  const context = canvas.getContext('2d');

  canvas.width = size;
  canvas.height = size;

  if (!context) {
    return new CanvasTexture(canvas);
  }

  context.fillStyle = '#10202a';
  context.fillRect(0, 0, size, size);

  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, 'rgba(136, 242, 255, 0.24)');
  gradient.addColorStop(0.5, 'rgba(246, 196, 92, 0.08)');
  gradient.addColorStop(1, 'rgba(136, 242, 255, 0.12)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  context.strokeStyle = 'rgba(136, 242, 255, 0.78)';
  context.lineWidth = 3;
  context.strokeRect(7, 7, size - 14, size - 14);

  context.strokeStyle = 'rgba(136, 242, 255, 0.28)';
  context.lineWidth = 1;
  for (let offset = 32; offset < size; offset += 32) {
    context.beginPath();
    context.moveTo(offset, 10);
    context.lineTo(offset, size - 10);
    context.moveTo(10, offset);
    context.lineTo(size - 10, offset);
    context.stroke();
  }

  context.strokeStyle = 'rgba(255, 211, 122, 0.88)';
  context.lineWidth = 10;
  for (let offset = -size; offset < size * 2; offset += 48) {
    context.beginPath();
    context.moveTo(offset, size);
    context.lineTo(offset + size, 0);
    context.stroke();
  }

  context.fillStyle = 'rgba(255, 255, 255, 0.18)';
  context.fillRect(20, 20, 34, 5);
  context.fillRect(20, 32, 22, 5);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  return texture;
};
