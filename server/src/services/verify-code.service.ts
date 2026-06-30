/**
 * 验证码服务
 * 基于 Redis 存储验证码，支持邮箱和手机号
 *
 * Redis Key 设计：
 *   verify:email:{email}       — 验证码 (STRING, TTL=300s)
 *   verify:phone:{phone}       — 验证码 (STRING, TTL=300s)
 *   verify:rate:{type}:{target} — 频率限制计数 (STRING, TTL=86400s)
 *   verify:cooldown:{type}:{target} — 发送冷却 (STRING, TTL=60s)
 *   verify:attempts:{type}:{target} — 验证尝试次数 (STRING, TTL=300s)
 */
import nodemailer from 'nodemailer';
import { redis } from '../config/redis.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/** 验证码类型 */
export type VerifyType = 'email' | 'phone';

/** 验证码用途 */
export type VerifyPurpose = 'bind' | 'unbind' | 'login';

/** 生成6位随机数字验证码 */
function generateCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

/** 获取验证码Redis Key */
function getCodeKey(type: VerifyType, target: string): string {
  return `verify:${type}:${target.toLowerCase()}`;
}

/** 获取频率限制Key */
function getRateKey(type: VerifyType, target: string): string {
  return `verify:rate:${type}:${target.toLowerCase()}`;
}

/** 获取冷却Key */
function getCooldownKey(type: VerifyType, target: string): string {
  return `verify:cooldown:${type}:${target.toLowerCase()}`;
}

/** 获取尝试次数Key */
function getAttemptsKey(type: VerifyType, target: string): string {
  return `verify:attempts:${type}:${target.toLowerCase()}`;
}

/** 创建SMTP传输器（懒加载单例） */
let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
}

/** 发送邮箱验证码 */
async function sendEmailCode(email: string, code: string, purpose: VerifyPurpose): Promise<void> {
  const purposeText: Record<VerifyPurpose, string> = {
    bind: '绑定邮箱',
    unbind: '解绑邮箱',
    login: '登录验证',
  };

  // 如果SMTP未配置，走控制台输出（开发模式）
  if (!config.smtp.user || !config.smtp.pass) {
    logger.info(`📧 [DEV模式] 邮箱验证码: ${code} → ${email} (${purposeText[purpose]})`);
    return;
  }

  await getTransporter().sendMail({
    from: config.smtp.from,
    to: email,
    subject: `MineChat - ${purposeText[purpose]}验证码`,
    html: `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:system-ui,sans-serif;
                  background:#0d0e12;color:#e0e0e8;border-radius:12px;border:1px solid rgba(255,255,255,.08)">
        <h2 style="margin:0 0 20px;color:#00F5D4;font-size:20px">MineChat</h2>
        <p style="margin:0 0 8px;font-size:14px;color:#8b8b9e">您正在进行<strong style="color:#e0e0e8">${purposeText[purpose]}</strong>操作</p>
        <div style="margin:24px 0;padding:16px;background:rgba(0,245,212,.08);border-radius:8px;text-align:center">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#00F5D4">${code}</span>
        </div>
        <p style="margin:0;font-size:12px;color:#6b6b7e">验证码5分钟内有效，请勿泄露给他人</p>
      </div>
    `,
  });

  logger.info(`📧 邮箱验证码已发送: ${email}`);
}

/** 发送手机验证码（开发阶段模拟） */
async function sendPhoneCode(phone: string, code: string, purpose: VerifyPurpose): Promise<void> {
  if (config.sms.mock) {
    logger.info(`📱 [模拟模式] 手机验证码: ${code} → ${phone} (${purpose})`);
    return;
  }
  // TODO: 接入阿里云/腾讯云SMS服务
  logger.info(`📱 手机验证码已发送: ${phone}`);
}

/**
 * 发送验证码
 * @param type 验证类型 email | phone
 * @param target 邮箱或手机号
 * @param purpose 用途 bind | unbind | login
 */
export async function sendVerifyCode(
  type: VerifyType,
  target: string,
  purpose: VerifyPurpose = 'bind',
): Promise<void> {
  // 1. 检查冷却（60秒内不能重复发送）
  const cooldownKey = getCooldownKey(type, target);
  const cooldownRemaining = await redis.ttl(cooldownKey);
  if (cooldownRemaining > 0) {
    throw new AppError(429, `请${cooldownRemaining}秒后再试`, 42901);
  }

  // 2. 检查每日发送上限（10次/天）
  const rateKey = getRateKey(type, target);
  const dailyCount = await redis.incr(rateKey);
  if (dailyCount === 1) {
    await redis.expire(rateKey, 86400); // 首次设置24小时过期
  }
  if (dailyCount > 10) {
    throw new AppError(429, '今日发送次数已达上限', 42902);
  }

  // 3. 生成验证码
  const code = generateCode();

  // 4. 存入Redis（5分钟有效）
  const codeKey = getCodeKey(type, target);
  await redis.set(codeKey, code, 'EX', 300);

  // 5. 设置冷却（60秒）
  await redis.set(cooldownKey, '1', 'EX', 60);

  // 6. 清除之前的尝试计数
  const attemptsKey = getAttemptsKey(type, target);
  await redis.del(attemptsKey);

  // 7. 发送验证码
  if (type === 'email') {
    await sendEmailCode(target, code, purpose);
  } else {
    await sendPhoneCode(target, code, purpose);
  }
}

/**
 * 验证验证码
 * @param type 验证类型
 * @param target 邮箱或手机号
 * @param code 用户输入的验证码
 * @returns 验证是否通过
 */
export async function verifyCode(
  type: VerifyType,
  target: string,
  code: string,
): Promise<boolean> {
  const codeKey = getCodeKey(type, target);
  const attemptsKey = getAttemptsKey(type, target);

  // 1. 检查尝试次数（最多5次）
  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) {
    await redis.expire(attemptsKey, 300); // 与验证码同有效期
  }
  if (attempts > 5) {
    // 超过5次，作废验证码
    await redis.del(codeKey);
    await redis.del(attemptsKey);
    throw new AppError(429, '验证次数过多，请重新获取验证码', 42903);
  }

  // 2. 从Redis取出验证码比对
  const storedCode = await redis.get(codeKey);
  if (!storedCode) {
    throw new AppError(400, '验证码已过期，请重新获取', 40001);
  }

  if (storedCode !== code) {
    return false;
  }

  // 3. 验证成功，删除验证码和尝试计数（防止重放）
  await redis.del(codeKey);
  await redis.del(attemptsKey);

  return true;
}

/**
 * 检查验证码是否存在且有效（不消耗验证码）
 */
export async function isCodeValid(type: VerifyType, target: string): Promise<boolean> {
  const codeKey = getCodeKey(type, target);
  const exists = await redis.exists(codeKey);
  return exists === 1;
}
