/**
 * Socket.IO 连接管理
 * 单例模式，全局复用同一连接
 */
import { io, type Socket } from 'socket.io-client';
import { useUserStore } from '../stores/user';

let socket: Socket | null = null;

/** 获取Socket实例（如不存在则创建） */
export function useSocket(): Socket {
  const userStore = useUserStore();

  if (socket?.connected) {
    return socket;
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

  socket = io(socketUrl, {
    auth: { token: userStore.token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[Socket] 已连接:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] 已断开:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] 连接错误:', err.message);
  });

  return socket;
}

/** 断开Socket连接 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
