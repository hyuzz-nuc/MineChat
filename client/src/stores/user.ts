import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/** 用户状态管理 */
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('minechat_access_token') || '');
  const refreshToken = ref(localStorage.getItem('minechat_refresh_token') || '');
  const userId = ref('');
  const username = ref('');
  const avatar = ref('');
  const status = ref<'online' | 'offline' | 'busy'>('online');

  const isLoggedIn = computed(() => !!token.value);

  /** 设置登录信息 */
  function setLogin(data: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    username: string;
    avatar?: string;
  }) {
    token.value = data.accessToken;
    refreshToken.value = data.refreshToken;
    userId.value = data.userId;
    username.value = data.username;
    avatar.value = data.avatar || '';
    localStorage.setItem('minechat_access_token', data.accessToken);
    localStorage.setItem('minechat_refresh_token', data.refreshToken);
  }

  /** 清除登录信息 */
  function clearLogin() {
    token.value = '';
    refreshToken.value = '';
    userId.value = '';
    username.value = '';
    avatar.value = '';
    localStorage.removeItem('minechat_access_token');
    localStorage.removeItem('minechat_refresh_token');
  }

  return {
    token,
    refreshToken,
    userId,
    username,
    avatar,
    status,
    isLoggedIn,
    setLogin,
    clearLogin,
  };
});
