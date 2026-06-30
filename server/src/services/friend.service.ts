/**
 * 好友服务层
 * 处理好友请求、好友列表、请求审批等业务逻辑
 */
import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

/** 发送好友请求 */
export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) {
    throw new AppError(400, '不能向自己发送好友请求', 40003);
  }

  // 检查目标用户是否存在
  const targetUser = await prisma.user.findUnique({ where: { id: addresseeId } });
  if (!targetUser) {
    throw new AppError(404, '目标用户不存在', 40403);
  }

  // 检查是否已有好友关系
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      throw new AppError(409, '已经是好友了', 40903);
    }
    if (existing.status === 'PENDING') {
      if (existing.requesterId === requesterId) {
        throw new AppError(409, '已发送过好友请求，等待对方同意', 40904);
      }
      // 对方已向自己发送过请求，直接同意
      return acceptFriendRequest(requesterId, existing.id);
    }
  }

  // 创建好友请求
  const friendship = await prisma.friendship.create({
    data: { requesterId, addresseeId, status: 'PENDING' },
    include: {
      requester: { select: { id: true, uid: true, username: true, nickname: true, avatar: true } },
      addressee: { select: { id: true, uid: true, username: true, nickname: true, avatar: true } },
    },
  });

  return friendship;
}

/** 同意好友请求 */
export async function acceptFriendRequest(userId: string, friendshipId: string) {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) {
    throw new AppError(404, '好友请求不存在', 40404);
  }

  // 只有被申请人才能同意
  if (friendship.addresseeId !== userId) {
    throw new AppError(403, '只能同意发给自己的好友请求', 40302);
  }

  if (friendship.status !== 'PENDING') {
    throw new AppError(400, '好友请求已处理', 40004);
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: 'ACCEPTED' },
    include: {
      requester: { select: { id: true, uid: true, username: true, nickname: true, avatar: true } },
      addressee: { select: { id: true, uid: true, username: true, nickname: true, avatar: true } },
    },
  });

  return updated;
}

/** 拒绝好友请求 */
export async function rejectFriendRequest(userId: string, friendshipId: string) {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) {
    throw new AppError(404, '好友请求不存在', 40404);
  }

  if (friendship.addresseeId !== userId) {
    throw new AppError(403, '只能拒绝发给自己的好友请求', 40303);
  }

  if (friendship.status !== 'PENDING') {
    throw new AppError(400, '好友请求已处理', 40004);
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: 'REJECTED' },
  });

  return updated;
}

/** 获取好友列表 */
export async function getFriendList(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
      status: 'ACCEPTED',
    },
    include: {
      requester: { select: { id: true, uid: true, username: true, nickname: true, avatar: true, status: true } },
      addressee: { select: { id: true, uid: true, username: true, nickname: true, avatar: true, status: true } },
    },
  });

  // 提取对方的信息
  const friends = friendships.map((f) => {
    const friendUser = f.requesterId === userId ? f.addressee : f.requester;
    return {
      friendshipId: f.id,
      ...friendUser,
    };
  });

  return friends;
}

/** 获取待处理的好友请求（发给自己的） */
export async function getPendingRequests(userId: string) {
  const requests = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: 'PENDING' },
    include: {
      requester: { select: { id: true, uid: true, username: true, nickname: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((r) => ({
    friendshipId: r.id,
    requester: r.requester,
    createdAt: r.createdAt,
  }));
}
