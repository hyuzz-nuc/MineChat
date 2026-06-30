/**
 * 用户服务层
 * 处理用户注册、登录、信息查询等业务逻辑
 */
import bcrypt from 'bcrypt';
import prisma from '../config/database.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = 12;

/** 生成6位数字UID（碰撞时重试） */
async function generateUid(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const uid = String(100000 + Math.floor(Math.random() * 900000));
    const exists = await prisma.user.findUnique({ where: { uid } });
    if (!exists) return uid;
  }
  throw new AppError(500, 'UID生成失败，请重试', 50001);
}

/** 注册 */
export async function register(data: {
  username: string;
  email: string;
  password: string;
  nickname: string;
}) {
  // 检查用户名是否已存在
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username: data.username }, { email: data.email }] },
  });
  if (existingUser) {
    if (existingUser.username === data.username) {
      throw new AppError(409, '用户名已被占用', 40901);
    }
    throw new AppError(409, '邮箱已被注册', 40902);
  }

  // 加密密码
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  // 生成6位数字UID
  const uid = await generateUid();

  // 创建用户
  const user = await prisma.user.create({
    data: {
      uid,
      username: data.username,
      email: data.email,
      passwordHash,
      nickname: data.nickname,
    },
    select: {
      id: true,
      uid: true,
      username: true,
      email: true,
      nickname: true,
      avatar: true,
      bio: true,
      createdAt: true,
    },
  });

  // 签发令牌
  const accessToken = signAccessToken({ userId: user.id, username: user.username });
  const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: 0 });

  logger.info(`用户注册成功: ${user.username}`);
  return { user, accessToken, refreshToken };
}

/** 登录 */
export async function login(account: string, password: string) {
  // 支持用户名或邮箱登录
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: account }, { email: account }] },
  });
  if (!user) {
    throw new AppError(401, '账号或密码错误', 40103);
  }

  // 验证密码
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, '账号或密码错误', 40103);
  }

  // 更新在线状态
  await prisma.user.update({
    where: { id: user.id },
    data: { status: 'ONLINE', lastSeenAt: new Date() },
  });

  // 签发令牌
  const accessToken = signAccessToken({ userId: user.id, username: user.username });
  const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: 0 });

  logger.info(`用户登录成功: ${user.username}`);
  return {
    user: {
      id: user.id,
      uid: user.uid,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      status: 'ONLINE',
    },
    accessToken,
    refreshToken,
  };
}

/** 刷新令牌 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true },
    });
    if (!user) {
      throw new AppError(401, '用户不存在', 40104);
    }

    // 签发新的access token
    const accessToken = signAccessToken({ userId: user.id, username: user.username });
    return { accessToken };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, '刷新令牌无效或已过期', 40105);
  }
}

/** 获取用户信息 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      uid: true,
      username: true,
      email: true,
      nickname: true,
      avatar: true,
      bio: true,
      status: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new AppError(404, '用户不存在', 40401);
  }
  return user;
}

/** 更新用户信息 */
export async function updateUserProfile(
  userId: string,
  data: { nickname?: string; avatar?: string; bio?: string },
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      uid: true,
      username: true,
      nickname: true,
      avatar: true,
      bio: true,
      status: true,
    },
  });
  return user;
}

/** 搜索用户（支持UID精确搜索 + 用户名模糊匹配） */
export async function searchUsers(keyword: string, currentUserId: string) {
  // 如果是纯数字且6位，优先按UID精确搜索
  const isUidSearch = /^\d{6}$/.test(keyword);
  
  if (isUidSearch) {
    const user = await prisma.user.findUnique({
      where: { uid: keyword },
      select: {
        id: true,
        uid: true,
        username: true,
        nickname: true,
        avatar: true,
        status: true,
      },
    });
    if (user && user.id !== currentUserId) return [user];
    return [];
  }

  // 用户名模糊匹配
  const users = await prisma.user.findMany({
    where: {
      username: { contains: keyword, mode: 'insensitive' },
      id: { not: currentUserId },
    },
    select: {
      id: true,
      uid: true,
      username: true,
      nickname: true,
      avatar: true,
      status: true,
    },
    take: 20,
  });
  return users;
}
