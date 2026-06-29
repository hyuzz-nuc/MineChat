/**
 * Axios 请求封装
 * 统一处理：token注入、401自动刷新、错误提示
 */
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { useUserStore } from '../stores/user';

/** 创建axios实例 */
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/** 请求拦截器：注入token */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/** 是否正在刷新token */
let isRefreshing = false;
/** 刷新期间等待的请求队列 */
let pendingRequests: Array<(token: string) => void> = [];

/** 响应拦截器：处理401自动刷新 */
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data;
    // 业务错误码不为0时，视为业务错误
    if (data.code !== 0) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return data;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 且未尝试过刷新
    if (error.response?.status === 401 && !originalRequest._retry) {
      const userStore = useUserStore();

      if (isRefreshing) {
        // 正在刷新，将请求加入队列等待
        return new Promise((resolve) => {
          pendingRequests.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(request(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = userStore.refreshToken;
        if (!refreshToken) throw new Error('无刷新令牌');

        // 请求刷新
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'}/auth/refresh`,
          { refreshToken },
        );

        if (res.data.code === 0) {
          const newAccessToken = res.data.data.accessToken;
          userStore.token = newAccessToken;
          localStorage.setItem('minechat_access_token', newAccessToken);

          // 重试队列中的请求
          pendingRequests.forEach((cb) => cb(newAccessToken));
          pendingRequests = [];

          // 重试原始请求
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return request(originalRequest);
        } else {
          throw new Error('刷新令牌失败');
        }
      } catch {
        // 刷新失败，清除登录状态，跳转登录页
        userStore.clearLogin();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // 其他错误
    const message = error.response?.data?.message || error.message || '网络错误';
    return Promise.reject(new Error(message));
  },
);

export default request;
