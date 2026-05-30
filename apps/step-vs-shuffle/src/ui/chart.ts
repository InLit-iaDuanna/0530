export interface ChartPoint {
  readonly t: number;
  readonly value: number;
  readonly mark?: boolean;
}

export class ChartRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private points: ChartPoint[] = [];
  private readonly maxPoints = 240;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot acquire 2D context');
    }
    this.ctx = ctx;
    this.resize();

    if (typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver(() => this.resize());
      obs.observe(canvas);
    }
  }

  push(point: ChartPoint): void {
    this.points.push(point);
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
  }

  draw(): void {
    const { ctx, canvas } = this;
    const w = canvas.width / this.dpr;
    const h = canvas.height / this.dpr;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (this.points.length < 2) {
      ctx.restore();
      return;
    }

    const range = 8;
    const yFor = (v: number): number => h / 2 - (v / range) * (h / 2 - 4);
    const xFor = (i: number): number => (i / (this.maxPoints - 1)) * w;

    ctx.strokeStyle = 'oklch(78% 0.12 220)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    this.points.forEach((p, i) => {
      const x = xFor(i + (this.maxPoints - this.points.length));
      const y = yFor(p.value);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    ctx.fillStyle = 'oklch(70% 0.22 20)';
    this.points.forEach((p, i) => {
      if (!p.mark) {
        return;
      }
      const x = xFor(i + (this.maxPoints - this.points.length));
      const y = yFor(p.value);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  reset(): void {
    this.points = [];
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
  }
}
