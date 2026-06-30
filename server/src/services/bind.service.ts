/**
 * 账号绑定服务
 * 处理邮箱/手机号的绑定、解绑业务逻辑
 */
import prisma from '../config/database.js';
import { sendVerifyCode, verifyCode, type VerifyType } from './verify-code.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * 绑定邮箱/手机号
 * @param userId 用户ID
 * @param type 绑定类型 email | phone
 * @param target 邮箱地址或手机号
 * @param code 验证码
 */
export async function bindAccount(
  userId: string,
  type: VerifyType,
  target: string,
  code: string,
): Promise<{
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
}> {
  // 1. 验证验证码
  const valid = await verifyCode(type, target, code);
  if (!valid) {
    throw new AppError(400, '验证码错误', 40002);
  }

  // 2. 检查target是否已被其他用户绑定
  if (type === 'email') {
    const existing = await prisma.user.findUnique({ where: { email: target } });
    if (existing && existing.id !== userId) {
      throw new AppError(409, '该邮箱已被其他账号绑定', 40903);
    }
  } else {
    const existing = await prisma.user.findUnique({ where: { phone: target } });
    if (existing && existing.id !== userId) {
      throw new AppError(409, '该手机号已被其他账号绑定', 40904);
    }
  }

  // 3. 更新用户数据
  const updateData = type === 'email'
    ? { email: target, emailVerified: true }
    : { phone: target, phoneVerified: true };

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      email: true,
      emailVerified: true,
      phone: true,
      phoneVerified: true,
    },
  });

  logger.info(`用户 ${userId} 绑定${type === 'email' ? '邮箱' : '手机号'}成功: ${target}`);
  return user;
}

/**
 * 解绑邮箱/手机号
 * @param userId 用户ID
 * @param type 解绑类型 email | phone
 * @param code 验证码（发送到已绑定的邮箱/手机）
 */
export async function unbindAccount(
  userId: string,
  type: VerifyType,
  code: string,
): Promise<void> {
  // 1. 获取用户当前绑定信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true, phone: true, phoneVerified: true },
  });
  if (!user) {
    throw new AppError(404, '用户不存在', 40401);
  }

  // 2. 检查是否已绑定
  const target = type === 'email' ? user.email : user.phone;
  if (!target) {
    throw new AppError(400, `未绑定${type === 'email' ? '邮箱' : '手机号'}`, 40003);
  }

  // 3. 检查至少保留一种绑定方式
  const hasEmail = !!user.email && user.emailVerified;
  const hasPhone = !!user.phone && user.phoneVerified;
  if (type === 'email' && !hasPhone) {
    throw new AppError(400, '至少保留一种绑定方式，请先绑定手机号', 40004);
  }
  if (type === 'phone' && !hasEmail) {
    throw new AppError(400, '至少保留一种绑定方式，请先绑定邮箱', 40005);
  }

  // 4. 验证验证码（发送到已绑定的target）
  const valid = await verifyCode(type, target, code);
  if (!valid) {
    throw new AppError(400, '验证码错误', 40002);
  }

  // 5. 解绑
  const updateData = type === 'email'
    ? { email: '', emailVerified: false }
    : { phone: null, phoneVerified: false };

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  logger.info(`用户 ${userId} 解绑${type === 'email' ? '邮箱' : '手机号'}成功`);
}

/**
 * 发送绑定/解绑验证码
 * @param userId 用户ID
 * @param type 验证类型
 * @param target 目标邮箱/手机号（绑定时传新值，解绑时传已绑定值）
 * @param purpose 用途 bind | unbind
 */
export async function sendBindCode(
  userId: string,
  type: VerifyType,
  target: string,
  purpose: 'bind' | 'unbind',
): Promise<void> {
  // 绑定时检查target是否已被占用
  if (purpose === 'bind') {
    if (type === 'email') {
      const existing = await prisma.user.findUnique({ where: { email: target } });
      if (existing && existing.id !== userId) {
        throw new AppError(409, '该邮箱已被其他账号绑定', 40903);
      }
    } else {
      const existing = await prisma.user.findUnique({ where: { phone: target } });
      if (existing && existing.id !== userId) {
        throw new AppError(409, '该手机号已被其他账号绑定', 40904);
      }
    }
  }

  await sendVerifyCode(type, target, purpose);
}
