/**
 * 消息服务层
 * 处理消息发送、会话列表、消息读取等业务逻辑
 */
import prisma from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

/** 发送消息 */
export async function sendMessage(
  senderId: string,
  roomId: string,
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' = 'TEXT',
  content: string,
  replyTo?: string,
) {
  // 验证用户是否在房间中
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: senderId } },
  });
  if (!membership) {
    throw new AppError(403, '你不在此房间中', 40301);
  }

  // 创建消息
  const message = await prisma.message.create({
    data: {
      roomId,
      senderId,
      type,
      content,
      replyTo,
    },
    include: {
      sender: { select: { id: true, uid: true, username: true, nickname: true, avatar: true },
      },
    },
  });

  // 更新房间最后消息时间
  await prisma.room.update({
    where: { id: roomId },
    data: { lastMsgAt: new Date() },
  });

  return message;
}

/** 获取房间消息列表（分页） */
export async function getRoomMessages(
  userId: string,
  roomId: string,
  cursor?: string,
  limit = 30,
) {
  // 验证用户是否在房间中
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!membership) {
    throw new AppError(403, '你不在此房间中', 40301);
  }

  const messages = await prisma.message.findMany({
    where: {
      roomId,
      deletedAt: null,
      ...(cursor ? { createdAt: { lt: (await prisma.message.findUnique({ where: { id: cursor } }))?.createdAt } } : {}),
    },
    include: {
      sender: { select: { id: true, uid: true, username: true, nickname: true, avatar: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return messages.reverse();
}

/** 标记消息已读 */
export async function markMessagesRead(userId: string, roomId: string) {
  // 验证成员关系
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!membership) {
    throw new AppError(403, '你不在此房间中', 40301);
  }

  // 更新最后阅读时间
  await prisma.roomMember.update({
    where: { id: membership.id },
    data: { lastRead: new Date() },
  });

  // 更新消息状态为已读
  await prisma.message.updateMany({
    where: {
      roomId,
      senderId: { not: userId },
      status: { not: 'READ' },
    },
    data: { status: 'READ' },
  });
}

/** 获取用户的会话列表 */
export async function getConversations(userId: string) {
  // 查找用户所在的所有房间
  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          members: {
            include: {
              user: { select: { id: true, uid: true, username: true, nickname: true, avatar: true, status: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: { select: { id: true, uid: true, username: true, nickname: true, avatar: true },
              },
            },
          },
          group: {
            select: { description: true, announcement: true },
          },
        },
      },
    },
    orderBy: { room: { lastMsgAt: 'desc' } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversations = memberships.map((m: any) => {
    const room = m.room;
    const lastMessage = room.messages[0] || null;

    // 计算未读数（需要单独查询以获取准确数量）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unreadCount = m.lastRead
      ? room.messages.filter(
          (msg: any) => msg.createdAt > m.lastRead! && msg.senderId !== userId,
        ).length
      : 0;

    // 私聊：对方信息作为显示名和头像
    let displayName = room.name || '';
    let displayAvatar = room.avatar || '';
    if (room.type === 'DIRECT') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const otherMember = room.members.find((rm: any) => rm.userId !== userId);
      if (otherMember) {
        displayName = otherMember.user.nickname || otherMember.user.username;
        displayAvatar = otherMember.user.avatar || '';
      }
    }

    return {
      roomId: room.id,
      type: room.type,
      displayName,
      displayAvatar,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            type: lastMessage.type,
            sender: lastMessage.sender,
            createdAt: lastMessage.createdAt,
          }
        : null,
      unreadCount,
      lastMsgAt: room.lastMsgAt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      members: room.members.map((rm: any) => ({
        userId: rm.user.id,
        username: rm.user.username,
        nickname: rm.user.nickname,
        avatar: rm.user.avatar,
        status: rm.user.status,
        role: rm.role,
      })),
      group: room.group,
    };
  });

  return conversations;
}

/** 创建私聊房间（如不存在） */
export async function createDirectRoom(userId: string, targetUserId: string) {
  if (userId === targetUserId) {
    throw new AppError(400, '不能和自己私聊', 40002);
  }

  // 检查目标用户是否存在
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new AppError(404, '目标用户不存在', 40402);
  }

  // 查找是否已有私聊房间
  const existingRoom = await prisma.room.findFirst({
    where: {
      type: 'DIRECT',
      members: {
        every: { userId: { in: [userId, targetUserId] } },
      },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, uid: true, username: true, nickname: true, avatar: true, status: true },
          },
        },
      },
    },
  });

  if (existingRoom && existingRoom.members.length === 2) {
    return { roomId: existingRoom.id, isNew: false, room: existingRoom };
  }

  // 创建新私聊房间
  const room = await prisma.room.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [
          { userId, role: 'MEMBER' },
          { userId: targetUserId, role: 'MEMBER' },
        ],
      },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, uid: true, username: true, nickname: true, avatar: true, status: true },
          },
        },
      },
    },
  });

  return { roomId: room.id, isNew: true, room };
}
