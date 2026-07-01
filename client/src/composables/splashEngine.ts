/**
 * 开机动画粒子引擎
 * 参照 MineRadio splash 效果，实现：
 *   - 尘埃粒子(dust)：微小白色圆点缓慢飘动
 *   - 光束线条(streak)：水平渐变光束滑过屏幕
 *   - 碎片(shard)：从中心扩散的平行四边形
 *   - 信号线(signal)：中央水平线从窄到宽
 *   - 波形线(wave)：正弦波频率线条
 *   - 闪光(flash)：短暂全屏水平闪光
 */

export interface SplashParticle {
  x: number; y: number; vx: number; vy: number;
  r: number; a: number; p: number;
  color: string; // RGB字符串如 '255,255,255'
}

export interface SplashStreak {
  x: number; y: number; len: number; width: number;
  speed: number; angle: number; phase: number;
  delay: number; color: string;
}

export interface SplashShard {
  ox: number; oy: number; w: number; h: number;
  skew: number; phase: number; color: string;
  delay: number; a: number;
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / Math.max(0.0001, e1 - e0));
  return t * t * (3 - 2 * t);
}
function easeOutCubic(t: number): number { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }

export class SplashEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private dust: SplashParticle[] = [];
  private streaks: SplashStreak[] = [];
  private shards: SplashShard[] = [];
  private animId: number | null = null;
  private startedAt = 0;
  private reduceMotion = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(1.6, Math.max(1, window.devicePixelRatio || 1));
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.initParticles();
  }

  private initParticles(): void {
    const w = this.w, h = this.h;
    const rm = this.reduceMotion;

    // 尘埃粒子（70%白 + 20%亮金 + 10%暗金）
    this.dust = [];
    const dustCount = rm ? 28 : 72;
    for (let i = 0; i < dustCount; i++) {
      const rng = Math.random();
      const color = rng < 0.10 ? '201,168,76'    // 暗金
                  : rng < 0.30 ? '244,210,138'    // 亮金
                  : '255,255,255';                 // 白
      this.dust.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.12,
        r: 0.5 + Math.random() * 1.5, a: 0.18 + Math.random() * 0.42, p: Math.random() * 6.28,
        color,
      });
    }

    // 光束线条
    this.streaks = [];
    const streakCount = rm ? 4 : 10;
    const colors = ['rgba(244,210,138,', 'rgba(201,168,76,', 'rgba(212,175,55,', 'rgba(232,180,184,'];
    for (let s = 0; s < streakCount; s++) {
      this.streaks.push({
        x: Math.random() * w, y: h * (0.20 + Math.random() * 0.62),
        len: w * (0.12 + Math.random() * 0.24), width: 0.75 + Math.random() * 2.1,
        speed: w * (0.00028 + Math.random() * 0.00042),
        angle: (-10 + Math.random() * 20) * Math.PI / 180,
        phase: Math.random() * 6.28, delay: 0.4 + Math.random() * 1.8,
        color: colors[s % colors.length],
      });
    }

    // 碎片
    this.shards = [];
    const shardCount = rm ? 6 : 16;
    const shardColors = ['rgba(244,210,138,', 'rgba(201,168,76,', 'rgba(212,175,55,', 'rgba(232,180,184,'];
    for (let h2 = 0; h2 < shardCount; h2++) {
      this.shards.push({
        ox: (Math.random() - 0.5) * w * 0.92, oy: (Math.random() - 0.5) * h * 0.22,
        w: 18 + Math.random() * 86, h: 2 + Math.random() * 5,
        skew: (Math.random() - 0.5) * 28, phase: Math.random() * 6.28,
        color: shardColors[h2 % shardColors.length],
        delay: 0.72 + Math.random() * 1.6, a: 0.12 + Math.random() * 0.38,
      });
    }
  }

  start(): void {
    this.startedAt = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
  }

  private loop(): void {
    this.animId = requestAnimationFrame(() => this.loop());
    const elapsed = (performance.now() - this.startedAt) / 1000;
    this.draw(elapsed);
  }

  private draw(t: number): void {
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);

    // 背景渐变
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, 'rgba(1,3,4,0.72)');
    bg.addColorStop(0.5, 'rgba(2,6,6,0.78)');
    bg.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 扫描线
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    const scanOff = (t * 28) % 36;
    for (let sy = -scanOff; sy < h; sy += 36) ctx.fillRect(0, sy, w, 1);
    ctx.restore();

    // 尘埃粒子
    for (const d of this.dust) {
      d.x += d.vx; d.y += d.vy; d.p += 0.018;
      if (d.x < -10) d.x = w + 10; if (d.x > w + 10) d.x = -10;
      if (d.y < -10) d.y = h + 10; if (d.y > h + 10) d.y = -10;
      const alpha = d.a * (0.58 + Math.sin(d.p + t * 0.8) * 0.34);
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.color},${Math.max(0, alpha).toFixed(3)})`;
      ctx.fill();
    }

    // 光束线条
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const st of this.streaks) {
      const travel = (t * st.speed * 240 + st.x + Math.sin(t * 0.8 + st.phase) * 28) % (w + st.len + 180);
      const px = travel - st.len - 90;
      const py = st.y + Math.sin(t * 0.75 + st.phase) * 18;
      const fade = smoothstep(st.delay * 0.55, st.delay * 0.55 + 0.52, t) * (1 - smoothstep(3.52, 4.12, t));
      if (fade <= 0) continue;
      ctx.save(); ctx.translate(px, py); ctx.rotate(st.angle);
      const sg = ctx.createLinearGradient(-st.len * 0.5, 0, st.len * 0.5, 0);
      sg.addColorStop(0, st.color + '0)');
      sg.addColorStop(0.5, st.color + (0.68 * fade).toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = sg; ctx.lineWidth = st.width;
      ctx.shadowColor = st.color + (0.34 * fade).toFixed(3) + ')'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(-st.len * 0.5, 0); ctx.lineTo(st.len * 0.5, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 信号线 + 波形 + 碎片 + 闪光
    const lineT = easeOutCubic((t - 0.12) / 1.18);
    const exitFade = 1 - smoothstep(3.58, 4.12, t);
    if (lineT > 0 && exitFade > 0) {
      const centerY = h * 0.5 + Math.sin(t * 1.4) * 1.6;
      const slitW = w * (0.16 + lineT * 0.72);
      const left = w * 0.5 - slitW * 0.5;
      const right = w * 0.5 + slitW * 0.5;
      const coreAlpha = (0.34 + lineT * 0.58) * exitFade;

      // 信号线
      const slitGrad = ctx.createLinearGradient(left, centerY, right, centerY);
      slitGrad.addColorStop(0, 'rgba(212,175,55,0)');
      slitGrad.addColorStop(0.3, `rgba(212,175,55,${(0.48 * coreAlpha).toFixed(3)})`);
      slitGrad.addColorStop(0.5, `rgba(244,210,138,${(0.68 * coreAlpha).toFixed(3)})`);
      slitGrad.addColorStop(0.7, `rgba(212,175,55,${(0.48 * coreAlpha).toFixed(3)})`);
      slitGrad.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.shadowColor = `rgba(212,175,55,${(0.48 * exitFade).toFixed(3)})`;
      ctx.shadowBlur = 42 + lineT * 42; ctx.lineCap = 'round';
      ctx.strokeStyle = slitGrad; ctx.lineWidth = 1.4 + lineT * 2.2;
      ctx.beginPath(); ctx.moveTo(left, centerY); ctx.lineTo(right, centerY); ctx.stroke();
      ctx.shadowBlur = 0;

      // 闪光
      const flash = smoothstep(2.82, 2.96, t) * (1 - smoothstep(2.96, 3.12, t)) * exitFade;
      if (flash > 0.015) {
        const fg = ctx.createLinearGradient(0, centerY, w, centerY);
        fg.addColorStop(0, 'rgba(201,168,76,0)');
        fg.addColorStop(0.35, `rgba(244,210,138,${(0.28 * flash).toFixed(3)})`);
        fg.addColorStop(0.5, `rgba(255,248,225,${(0.42 * flash).toFixed(3)})`);
        fg.addColorStop(0.65, `rgba(244,210,138,${(0.28 * flash).toFixed(3)})`);
        fg.addColorStop(1, 'rgba(201,168,76,0)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, centerY - 46 * flash, w, 92 * flash);
      }

      // 波形线
      const waveAlpha = smoothstep(0.72, 1.95, t) * exitFade;
      if (waveAlpha > 0) {
        ctx.shadowBlur = 20;
        ctx.strokeStyle = `rgba(244,210,138,${(0.22 * waveAlpha).toFixed(3)})`;
        ctx.lineWidth = 1; ctx.beginPath();
        const steps = 82;
        for (let wi = 0; wi <= steps; wi++) {
          const u = wi / steps;
          const x2 = left + u * (right - left);
          const amp = 6 * lineT * Math.sin(u * Math.PI);
          const y2 = centerY + Math.sin(u * 34 + t * 8.2) * amp + Math.sin(u * 87 - t * 5.1) * amp * 0.18;
          if (wi === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
        }
        ctx.stroke(); ctx.shadowBlur = 0;
      }

      // 碎片
      const shardT = smoothstep(0.72, 2.45, t) * exitFade;
      for (const sh of this.shards) {
        const drift = Math.sin(t * 1.7 + sh.phase) * 22;
        const sx = w * 0.5 + sh.ox * (0.18 + shardT * 0.82) + drift;
        const sy = centerY + sh.oy * (0.20 + shardT * 0.92);
        const localAlpha = sh.a * smoothstep(sh.delay * 0.48, sh.delay * 0.48 + 0.62, t) * exitFade;
        if (localAlpha <= 0) continue;
        ctx.save(); ctx.translate(sx, sy);
        ctx.rotate((-6 + sh.skew * 0.10) * Math.PI / 180);
        ctx.fillStyle = sh.color + Math.max(0, localAlpha).toFixed(3) + ')';
        ctx.shadowColor = sh.color + Math.min(0.38, localAlpha * 1.2).toFixed(3) + ')';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(-sh.w * 0.5, -sh.h * 0.5);
        ctx.lineTo(sh.w * 0.5, -sh.h * 0.5);
        ctx.lineTo(sh.w * 0.5 + sh.skew, sh.h * 0.5);
        ctx.lineTo(-sh.w * 0.5 + sh.skew, sh.h * 0.5);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
  }

  destroy(): void {
    this.stop();
    this.dust = []; this.streaks = []; this.shards = [];
  }
}
