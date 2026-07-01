/**
 * MineChat 弹幕引擎 - Canvas 2D 高性能渲染
 * 金属金配色体系，与V3视觉规范统一
 */

export type DanmakuType = 'roll' | 'top' | 'bottom';

export interface DanmakuConfig {
  width: number;
  height: number;
  maxCount?: number;
  speed?: number;
  fontSize?: number;
  trackCount?: number;
  trackGap?: number;
  opacity?: number;
  enabled?: boolean;
}

export interface DanmakuItem {
  id: string;
  text: string;
  type: DanmakuType;
  color?: string;
  fontSize?: number;
  sender?: string;
  isSystem?: boolean;
}

interface RenderObj {
  id: string; text: string; type: DanmakuType; color: string; fontSize: number;
  opacity: number; x: number; y: number; speed: number; textWidth: number;
  stayFrames: number; stayedFrames: number; dead: boolean; isSystem: boolean;
  fixedTrackIdx?: number;
}

interface TrackState { lastRight: number; lastSpeed: number; lastWidth: number; }

export class DanmakuEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cfg: Required<DanmakuConfig>;
  private list: RenderObj[] = [];
  private queue: DanmakuItem[] = [];
  private tracks: TrackState[] = [];
  private topUsed: boolean[] = [];
  private btmUsed: boolean[] = [];
  private rafId: number | null = null;
  private running = false;
  private noMotion = false;
  private cnt = 0;

  constructor(c: DanmakuConfig) {
    this.cfg = {
      width: c.width, height: c.height, maxCount: c.maxCount ?? 80,
      speed: c.speed ?? 2.5, fontSize: c.fontSize ?? 16, trackCount: c.trackCount ?? 8,
      trackGap: c.trackGap ?? 6, opacity: c.opacity ?? 0.85, enabled: c.enabled ?? true,
    };
    this.noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resetTracks();
  }

  private resetTracks(): void {
    this.tracks = Array.from({ length: this.cfg.trackCount }, () => ({ lastRight: -Infinity, lastSpeed: 0, lastWidth: 0 }));
    this.topUsed = [false, false, false];
    this.btmUsed = [false, false, false];
  }

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const d = devicePixelRatio || 1;
    canvas.width = this.cfg.width * d;
    canvas.height = this.cfg.height * d;
    canvas.style.width = `${this.cfg.width}px`;
    canvas.style.height = `${this.cfg.height}px`;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(d, d);
  }

  resize(w: number, h: number): void {
    this.cfg.width = w; this.cfg.height = h;
    if (this.canvas && this.ctx) {
      const d = devicePixelRatio || 1;
      this.canvas.width = w * d; this.canvas.height = h * d;
      this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
      this.ctx.scale(d, d);
    }
    this.resetTracks();
  }

  start(): void { if (!this.running) { this.running = true; this.tick(); } }
  stop(): void { this.running = false; if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; } }
  send(item: DanmakuItem): void { if (!this.cfg.enabled || this.noMotion) return; this.queue.push(item); this.drain(); }
  sendBatch(items: DanmakuItem[]): void { if (!this.cfg.enabled) return; items.forEach(i => this.queue.push(i)); this.drain(); }
  toggle(e?: boolean): void { this.cfg.enabled = e ?? !this.cfg.enabled; if (!this.cfg.enabled) this.clear(); }
  clear(): void { this.list = []; this.queue = []; this.resetTracks(); }
  destroy(): void { this.stop(); this.clear(); this.canvas = null; this.ctx = null; }

  private drain(): void {
    while (this.queue.length > 0 && this.list.length < this.cfg.maxCount) {
      const item = this.queue.shift()!;
      const obj = this.build(item);
      if (obj) this.list.push(obj);
    }
  }

  private findTrack(tw: number): number {
    for (let i = 0; i < this.cfg.trackCount; i++) {
      const t = this.tracks[i];
      if (t.lastRight <= this.cfg.width - tw - 40) return i;
      if (t.lastSpeed > this.cfg.speed * 1.2 && t.lastRight < this.cfg.width) return i;
    }
    return -1;
  }

  private trackY(i: number, fs: number): number { return 12 + i * (fs + this.cfg.trackGap); }

  private build(item: DanmakuItem): RenderObj | null {
    if (!this.ctx) return null;
    const tp = item.type || 'roll';
    const fs = item.fontSize || this.cfg.fontSize;
    const clr = item.color || (item.isSystem ? '#8A9099' : '#D4AF37');
    this.ctx.font = `600 ${fs}px "Noto Sans SC","PingFang SC",sans-serif`;
    const tw = this.ctx.measureText(item.text).width;
    const base = {
      id: item.id || `d${++this.cnt}`, text: item.text, color: clr, fontSize: fs,
      opacity: this.cfg.opacity, textWidth: tw, stayFrames: 0, stayedFrames: 0,
      dead: false, isSystem: !!item.isSystem,
    };

    if (tp === 'roll') {
      const ti = this.findTrack(tw);
      if (ti < 0) return null;
      const sp = this.cfg.speed * (0.8 + Math.random() * 0.4);
      this.tracks[ti] = { lastRight: this.cfg.width + 20, lastSpeed: sp, lastWidth: tw };
      return { ...base, type: 'roll', x: this.cfg.width + 20, y: this.trackY(ti, fs), speed: sp };
    }
    if (tp === 'top') {
      const ti = this.topUsed.indexOf(false);
      if (ti < 0) return null;
      this.topUsed[ti] = true;
      return { ...base, type: 'top', x: (this.cfg.width - tw) / 2, y: 20 + ti * (fs + this.cfg.trackGap), speed: 0, stayFrames: 180, fixedTrackIdx: ti };
    }
    if (tp === 'bottom') {
      const ti = this.btmUsed.indexOf(false);
      if (ti < 0) return null;
      this.btmUsed[ti] = true;
      return { ...base, type: 'bottom', x: (this.cfg.width - tw) / 2, y: this.cfg.height - 20 - (3 - ti) * (fs + this.cfg.trackGap), speed: 0, stayFrames: 180, fixedTrackIdx: ti };
    }
    return null;
  }

  private tick = (): void => {
    if (!this.running || !this.ctx) return;
    this.rafId = requestAnimationFrame(this.tick);

    // 更新位置
    for (const o of this.list) {
      if (o.dead) continue;
      if (o.type === 'roll') {
        o.x -= o.speed;
        if (o.x + o.textWidth < -10) o.dead = true;
      } else {
        o.stayedFrames++;
        if (o.stayedFrames >= o.stayFrames) {
          o.dead = true;
          if (o.type === 'top' && o.fixedTrackIdx !== undefined) this.topUsed[o.fixedTrackIdx] = false;
          if (o.type === 'bottom' && o.fixedTrackIdx !== undefined) this.btmUsed[o.fixedTrackIdx] = false;
        }
      }
    }

    // 清除死亡弹幕
    this.list = this.list.filter(o => !o.dead);
    this.drain();

    // 绘制
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cfg.width, this.cfg.height);

    for (const o of this.list) {
      ctx.save();
      ctx.globalAlpha = o.opacity;
      ctx.font = `600 ${o.fontSize}px "Noto Sans SC","PingFang SC",sans-serif`;

      // 描边增强可读性
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(o.text, o.x, o.y + o.fontSize);

      // 填充文字
      ctx.fillStyle = o.color;
      ctx.fillText(o.text, o.x, o.y + o.fontSize);

      ctx.restore();
    }
  };
}