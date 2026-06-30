/**
 * 认证相关API
 */
import request from './request';

/** 注册 */
export function registerApi(data: {
  username: string;
  email: string;
  password: string;
  nickname: string;
}) {
  return request.post('/auth/register', data);
}

/** 登录 */
export function loginApi(data: { account: string; password: string }) {
  return request.post('/auth/login', data);
}

/** 刷新令牌 */
export function refreshTokenApi(refreshToken: string) {
  return request.post('/auth/refresh', { refreshToken });
}

/** 获取当前用户信息 */
export function getProfileApi() {
  return request.get('/user/profile');
}

/** 更新用户信息 */
export function updateProfileApi(data: { nickname?: string; avatar?: string; bio?: string }) {
  return request.patch('/user/profile', data);
}

/** 搜索用户 */
export function searchUsersApi(keyword: string) {
  return request.get('/user/search', { params: { keyword } });
}

/** 发送验证码 */
export function sendCodeApi(data: { type: 'email' | 'phone'; target: string; purpose: 'bind' | 'unbind' | 'login' }) {
  return request.post('/auth/send-code', data);
}

/** 绑定邮箱/手机号 */
export function bindAccountApi(data: { type: 'email' | 'phone'; target: string; code: string }) {
  return request.post('/user/bind', data);
}

/** 解绑邮箱/手机号 */
export function unbindAccountApi(data: { type: 'email' | 'phone'; code: string }) {
  return request.post('/user/unbind', data);
}
