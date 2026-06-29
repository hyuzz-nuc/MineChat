/**
 * 消息相关API
 */
import request from './request';

/** 发送消息 */
export function sendMessageApi(data: {
  roomId: string;
  type?: string;
  content: string;
  replyTo?: string;
}) {
  return request.post('/messages', data);
}

/** 获取房间消息列表 */
export function getRoomMessagesApi(roomId: string, params?: { cursor?: string; limit?: number }) {
  return request.get(`/rooms/${roomId}/messages`, { params });
}

/** 标记消息已读 */
export function markReadApi(roomId: string) {
  return request.patch(`/rooms/${roomId}/read`);
}

/** 获取会话列表 */
export function getConversationsApi() {
  return request.get('/conversations');
}

/** 创建私聊房间 */
export function createDirectRoomApi(targetUserId: string) {
  return request.post('/rooms/direct', { targetUserId });
}
