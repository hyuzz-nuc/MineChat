/**
 * 好友相关API
 */
import request from './request';

/** 发送好友请求 */
export function sendFriendRequestApi(targetUserId: string) {
  return request.post('/friends/request', { targetUserId });
}

/** 同意好友请求 */
export function acceptFriendRequestApi(friendshipId: string) {
  return request.patch(`/friends/${friendshipId}/accept`);
}

/** 拒绝好友请求 */
export function rejectFriendRequestApi(friendshipId: string) {
  return request.patch(`/friends/${friendshipId}/reject`);
}

/** 获取好友列表 */
export function getFriendListApi() {
  return request.get('/friends');
}

/** 获取待处理好友请求 */
export function getPendingRequestsApi() {
  return request.get('/friends/pending');
}
