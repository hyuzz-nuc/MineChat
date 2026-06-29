/**
 * Socket.IO 消息事件处理器
 * 处理实时消息发送、打字状态、已读回执
 * 在线状态已迁移至 Redis（支持多进程/重启不丢失）
 */
import { Server, Socket } from 'socket.io';
import * as messageService from '../../services/message.service.js';
import * as presenceService from '../../services/presence.service.js';
import prisma from '../../config/database.js';
import { logger } from '../../utils/logger.js';

/** 注册消息事件处理器 */
export function registerMessageHandlers(io: Server, socket: Socket): void {
  if (!socket.userId) return;

  const userId = socket.userId;

  // ────────── 加入用户个人房间 ──────────
  socket.join(`user:${userId}`);

  // Redis 记录在线状态
  presenceService.userOnline(userId, socket.id).then(() => {
    // 广播上线状态
    updateUserPresence(io, userId, 'ONLINE');
  });

  // ────────── 加入所有会话房间 ──────────
  joinUserRooms(io, socket, userId);

  // ────────── 事件：发送消息 ──────────
  socket.on('message:send', async (data) => {
    try {
      const { roomId, type, content, replyTo } = data;
      const message = await messageService.sendMessage(
        userId,
        roomId,
        type || 'TEXT',
        content,
        replyTo,
      );

      // 广播给房间内所有成员
      io.to(`room:${roomId}`).emit('message:new', message);

      // 通知会话列表更新（给房间内所有用户的个人房间发）
      const members = await prisma.roomMember.findMany({
        where: { roomId },
        select: { userId: true },
      });
      members.forEach((m: { userId: string }) => {
        io.to(`user:${m.userId}`).emit('conversation:update', {
          roomId,
          lastMessage: {
            id: message.id,
            content: message.content,
            type: message.type,
            sender: message.sender,
            createdAt: message.createdAt,
          },
          lastMsgAt: message.createdAt,
        });
      });
    } catch (err: any) {
      logger.error(`Socket消息发送失败: ${err.message}`);
      socket.emit('error:message', { message: err.message || '消息发送失败' });
    }
  });

  // ────────── 事件：打字状态 ──────────
  socket.on('typing:start', (data) => {
    const { roomId } = data;
    socket.to(`room:${roomId}`).emit('typing:start', { userId, roomId });
  });

  socket.on('typing:stop', (data) => {
    const { roomId } = data;
    socket.to(`room:${roomId}`).emit('typing:stop', { userId, roomId });
  });

  // ────────── 事件：标记已读 ──────────
  socket.on('message:read', async (data) => {
    try {
      const { roomId } = data;
      await messageService.markMessagesRead(userId, roomId);
      // 通知房间内其他成员
      socket.to(`room:${roomId}`).emit('message:read', { userId, roomId });
    } catch (err: any) {
      logger.error(`Socket已读标记失败: ${err.message}`);
    }
  });

  // ────────── 事件：更新在线状态 ──────────
  socket.on('presence:update', async (data) => {
    const { status } = data; // ONLINE / BUSY / AWAY
    if (['ONLINE', 'BUSY', 'AWAY'].includes(status)) {
      await presenceService.setUserStatus(userId, status);
      await updateUserPresence(io, userId, status);
    }
  });

  // ────────── 断开连接 ──────────
  socket.on('disconnect', async () => {
    logger.info(`Socket disconnected: ${socket.id} (user: ${userId})`);

    // Redis 移除在线记录
    const isFullyOffline = await presenceService.userOffline(userId, socket.id);
    if (isFullyOffline) {
      // 所有连接断开，广播离线
      await updateUserPresence(io, userId, 'OFFLINE');
    }
  });
}

/** 加入用户所有会话的Socket房间 */
async function joinUserRooms(io: Server, socket: Socket, userId: string): Promise<void> {
  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    select: { roomId: true },
  });
  memberships.forEach((m: { roomId: string }) => {
    socket.join(`room:${m.roomId}`);
  });
}

/** 更新用户在线状态并广播 */
async function updateUserPresence(io: Server, userId: string, status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY'): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { status, lastSeenAt: new Date() },
  });

  // 广播给所有在线用户
  io.emit('presence:update', { userId, status, lastSeenAt: new Date().toISOString() });
}
