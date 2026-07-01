/**
 * 好友相关API
 */
import request from './request';

/** 发送好友请求 */
export function sendFriendRequestApi(targetUserId: string) {
  return request.post('/friend/request', { targetUserId });
}

/** 同意好友请求 */
export function acceptFriendRequestApi(friendshipId: string) {
  return request.post(`/friend/accept/${friendshipId}`);
}

/** 拒绝好友请求 */
export function rejectFriendRequestApi(friendshipId: string) {
  return request.post(`/friend/reject/${friendshipId}`);
}

/** 获取好友列表 */
export function getFriendListApi() {
  return request.get('/friend/list');
}

/** 获取收到的待处理好友请求 */
export function getReceivedRequestsApi() {
  return request.get('/friend/requests/received');
}

/** 获取发出的待处理好友请求 */
export function getSentRequestsApi() {
  return request.get('/friend/requests/sent');
}
