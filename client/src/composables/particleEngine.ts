/**
 * 粒子引擎 — Canvas 2D 深空粒子背景
 * 参照 docs/05-粒子动态特效设计文档.md
 *
 * 四类粒子：深空星尘 + 光点漂浮 + 连线网络 + 呼吸脉冲
 * 性能目标：CPU<5%, 30fps, 粒子200-400
 */

/** 单个粒子 */
interface Particle {
  x: number;        // 0~1 归一化
  y: number;        // 0~1 归一化
  z: number;        // 深度 0~1
  vx: number;
  vy: number;
  speed: number;
  size: number;
  opacity: number;
  phase: number;    // 呼吸相位
  seed: number;
}

/** 流星 */
interface Meteor {
  x: number;        // 起始x (px)
  y: number;        // 起始y (px)
  angle: number;    // 弧度
  speed: number;    // px/s
  length: number;   // 尾迹长度(px)
  life: number;     // 剩余生命(0~1)
  maxLife: number;  // 总生命(s)
  elapsed: number;  // 已过时间(s)
  width: number;    // 头部宽度
}

/** 鼠标状态 */
interface MouseState {
  x: number;
  y: number;
  active: boolean;
}

/** 引擎配置 */
export interface ParticleConfig {
  /** 深空星尘数量 */
  dustCount?: number;
  /** 光点数量 */
  glowCount?: number;
  /** 连线距离阈值(px) */
  linkDistance?: number;
  /** 呼吸脉冲数量 */
  pulseCount?: number;
  /** 流星最大同时存在数 */
  meteorCount?: number;
  /** 流星出现间隔下限(ms) */
  meteorIntervalMin?: number;
  /** 流星出现间隔上限(ms) */
  meteorIntervalMax?: number;
  /** 目标帧率 */
  targetFps?: number;
  /** 鼠标影响半径(px) */
  mouseRadius?: number;
  /** 鼠标推力 */
  mouseForce?: number;
  /** 是否启用(响应 prefers-reduced-motion) */
  enabled?: boolean;
}

const DEFAULT_CONFIG: Required<ParticleConfig> = {
  dustCount: 160,
  glowCount: 40,
  linkDistance: 120,
  pulseCount: 6,
  meteorCount: 4,
  meteorIntervalMin: 2000,
  meteorIntervalMax: 5000,
  targetFps: 30,
  mouseRadius: 200,
  mouseForce: 0.3,
  enabled: true,
};

/** 伪随机 (确定性, 基于种子) */
function rand(seed: number): number {
  return Math.abs(Math.sin(seed * 3187.917) * 43758.5453) % 1;
}

/** 创建单个粒子 */
function createParticle(index: number, type: 'dust' | 'glow'): Particle {
  const i = index + 1;
  const seed = type === 'dust' ? i * 11.37 : i * 23.71;
  return {
    x: rand(seed),
    y: rand(seed * 2.7),
    z: type === 'dust' ? rand(seed * 8.1) * 0.6 : 0.6 + rand(seed * 5.3) * 0.4,
    vx: 0,
    vy: 0,
    speed: type === 'dust'
      ? 0.002 + rand(seed * 4.2) * 0.006
      : 0.004 + rand(seed * 3.1) * 0.008,
    size: type === 'dust'
      ? 0.5 + rand(seed * 6.3) * 1.5
      : 1.5 + rand(seed * 7.8) * 2.5,
    opacity: type === 'dust'
      ? 0.08 + rand(seed * 9.2) * 0.18
      : 0.15 + rand(seed * 8.6) * 0.25,
    phase: rand(seed * 12.1) * Math.PI * 2,
    seed,
  };
}

/**
 * 粒子引擎类
 * 用法: const engine = new ParticleEngine(canvas, config); engine.start();
 */
export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: Required<ParticleConfig>;
  private dustParticles: Particle[] = [];
  private glowParticles: Particle[] = [];
  private mouse: MouseState = { x: -9999, y: -9999, active: false };
  private rafId: number = 0;
  private lastFrameTime: number = 0;
  private frameInterval: number = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private running = false;
  // 呼吸脉冲位置(归一化)
  private pulses: Array<{ x: number; y: number; phase: number; size: number }> = [];
  // 流星池
  private meteors: Meteor[] = [];
  private nextMeteorTime: number = 0;

  constructor(canvas: HTMLCanvasElement, config: ParticleConfig = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.frameInterval = 1000 / this.config.targetFps;

    // 检测 prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.config.enabled = false;
    }
  }

  /** 初始化粒子池 */
  private initParticles(): void {
    this.dustParticles = [];
    this.glowParticles = [];
    for (let i = 0; i < this.config.dustCount; i++) {
      this.dustParticles.push(createParticle(i, 'dust'));
    }
    for (let i = 0; i < this.config.glowCount; i++) {
      this.glowParticles.push(createParticle(i, 'glow'));
    }
    // 呼吸脉冲
    this.pulses = [];
    for (let i = 0; i < this.config.pulseCount; i++) {
      this.pulses.push({
        x: rand(i * 31.7),
        y: rand(i * 47.3),
        phase: rand(i * 19.9) * Math.PI * 2,
        size: 80 + rand(i * 27.1) * 120,
      });
    }
    // 流星池
    this.meteors = [];
    this.nextMeteorTime = performance.now() + 1000 + Math.random() * 2000;
  }

  /** 创建一颗流星 */
  private spawnMeteor(): void {
    const W = this.width;
    const H = this.height;
    // 角度15°~45°（斜向下）
    const angle = (15 + Math.random() * 30) * Math.PI / 180;
    // 从上方或右侧出发
    const fromTop = Math.random() > 0.3;
    const x = fromTop ? Math.random() * W : W + 20;
    const y = fromTop ? -20 : Math.random() * H * 0.4;
    const speed = 300 + Math.random() * 300; // px/s
    const length = 80 + Math.random() * 120;
    const maxLife = (Math.max(W, H) * 1.5) / speed;

    this.meteors.push({
      x, y, angle, speed, length,
      life: 1, maxLife, elapsed: 0,
      width: 1.5 + Math.random() * 0.5,
    });
  }

  /** 处理resize */
  private handleResize = (): void => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  /** 鼠标移动 */
  private handleMouseMove = (e: MouseEvent): void => {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    this.mouse.active = true;
  };

  private handleMouseLeave = (): void => {
    this.mouse.active = false;
  };

  /** 更新粒子位置 */
  private updateParticles(time: number): void {
    const t = time * 0.001; // 秒
    const allParticles = [...this.dustParticles, ...this.glowParticles];

    for (const p of allParticles) {
      // 基础漂浮运动
      const angle = t * p.speed * 0.5 + p.phase;
      const targetVx = Math.sin(angle) * p.speed;
      const targetVy = Math.cos(angle * 0.7 + p.seed) * p.speed;

      // 鼠标推力
      let pushX = 0, pushY = 0;
      if (this.mouse.active) {
        const px = p.x * this.width;
        const py = p.y * this.height;
        const dx = px - this.mouse.x;
        const dy = py - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.config.mouseRadius && dist > 1) {
          const force = (1 - dist / this.config.mouseRadius) * this.config.mouseForce;
          pushX = (dx / dist) * force;
          pushY = (dy / dist) * force;
        }
      }

      // 平滑过渡速度
      p.vx += (targetVx + pushX - p.vx) * 0.05;
      p.vy += (targetVy + pushY - p.vy) * 0.05;

      // 更新位置
      p.x += p.vx;
      p.y += p.vy;

      // 边界环绕
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;
      if (p.y < -0.05) p.y = 1.05;
      if (p.y > 1.05) p.y = -0.05;
    }
  }

  /** 绘制帧 */
  private draw(time: number): void {
    const t = time * 0.001;
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    ctx.clearRect(0, 0, W, H);

    // ─── 呼吸脉冲 (最底层) ───
    for (const pulse of this.pulses) {
      const breath = 0.5 + 0.5 * Math.sin(t * 0.8 + pulse.phase);
      const alpha = 0.02 + breath * 0.04;
      const cx = pulse.x * W;
      const cy = pulse.y * H;
      const r = pulse.size * (0.8 + breath * 0.4);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(212,175,55,${alpha})`);
      grad.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    // ─── 深空星尘 ───
    for (const p of this.dustParticles) {
      const breath = 0.7 + 0.3 * Math.sin(t * 1.2 + p.phase);
      const alpha = p.opacity * breath;
      const x = p.x * W;
      const y = p.y * H;
      const size = p.size * (0.6 + p.z * 0.4);

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,175,55,${alpha})`;
      ctx.fill();
    }

    // ─── 连线网络 (仅深空星尘之间) ───
    const linkDist = this.config.linkDistance;
    const linkDistSq = linkDist * linkDist;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < this.dustParticles.length; i++) {
      const a = this.dustParticles[i];
      const ax = a.x * W;
      const ay = a.y * H;
      for (let j = i + 1; j < this.dustParticles.length; j++) {
        const b = this.dustParticles[j];
        const dx = ax - b.x * W;
        const dy = ay - b.y * H;
        const distSq = dx * dx + dy * dy;
        if (distSq < linkDistSq) {
          const alpha = (1 - Math.sqrt(distSq) / linkDist) * 0.06;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(b.x * W, b.y * H);
          ctx.strokeStyle = `rgba(212,175,55,${alpha})`;
          ctx.stroke();
        }
      }
    }

    // ─── 光点漂浮 ───
    for (const p of this.glowParticles) {
      const breath = 0.6 + 0.4 * Math.sin(t * 0.9 + p.phase);
      const alpha = p.opacity * breath;
      const x = p.x * W;
      const y = p.y * H;
      const size = p.size;

      // 光晕
      const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.6})`);
      grad.addColorStop(0.4, `rgba(255,255,255,${alpha * 0.2})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6);

      // 核心点
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }

    // ─── 流星 ───
    for (const m of this.meteors) {
      const fadeIn = Math.min(m.elapsed / 0.3, 1);
      const fadeOut = Math.max(0, 1 - m.elapsed / m.maxLife);
      const alpha = fadeIn * fadeOut;
      if (alpha <= 0) continue;

      const headX = m.x;
      const headY = m.y;
      const tailX = headX - Math.cos(m.angle) * m.length;
      const tailY = headY - Math.sin(m.angle) * m.length;

      // 尾迹渐变线
      const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
      grad.addColorStop(0, 'rgba(245,230,184,0)');
      grad.addColorStop(0.6, `rgba(245,230,184,${alpha * 0.3})`);
      grad.addColorStop(1, `rgba(255,248,225,${alpha * 0.8})`);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = m.width * alpha;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 头部光点
      ctx.beginPath();
      ctx.arc(headX, headY, m.width * 1.5 * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,248,225,${alpha * 0.9})`;
      ctx.fill();
    }
  }

  /** 动画循环 */
  private animate = (time: number): void => {
    if (!this.running) return;

    // 帧率控制
    const delta = time - this.lastFrameTime;
    if (delta < this.frameInterval) {
      this.rafId = requestAnimationFrame(this.animate);
      return;
    }
    this.lastFrameTime = time - (delta % this.frameInterval);

    this.updateParticles(time);

    // 流星：生成 + 更新
    const dt = (time - this.lastFrameTime) / 1000 || 0.033;
    if (time >= this.nextMeteorTime && this.meteors.length < this.config.meteorCount) {
      this.spawnMeteor();
      const interval = this.config.meteorIntervalMin +
        Math.random() * (this.config.meteorIntervalMax - this.config.meteorIntervalMin);
      this.nextMeteorTime = time + interval;
    }
    for (const m of this.meteors) {
      m.x += Math.cos(m.angle) * m.speed * dt;
      m.y += Math.sin(m.angle) * m.speed * dt;
      m.elapsed += dt;
    }
    // 移除过期流星
    this.meteors = this.meteors.filter(m => m.elapsed < m.maxLife);

    this.draw(time);

    this.rafId = requestAnimationFrame(this.animate);
  };

  /** 启动引擎 */
  start(): void {
    if (!this.config.enabled) return;
    if (this.running) return;

    this.handleResize();
    this.initParticles();
    this.running = true;

    // 事件监听（监听window而非canvas，因为canvas是pointer-events:none）
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseleave', this.handleMouseLeave);

    this.rafId = requestAnimationFrame(this.animate);
  }

  /** 停止引擎 */
  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseleave', this.handleMouseLeave);
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /** 触发消息脉冲 (收到新消息时短暂加速) */
  pulse(): void {
    for (const p of this.dustParticles) {
      p.speed *= 2.5;
    }
    setTimeout(() => {
      for (const p of this.dustParticles) {
        p.speed /= 2.5;
      }
    }, 500);
  }

  /** 是否正在运行 */
  isActive(): boolean {
    return this.running;
  }
}
