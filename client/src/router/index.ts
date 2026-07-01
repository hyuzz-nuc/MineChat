import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'Chat',
      component: () => import('../views/ChatView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/theater',
      name: 'Theater',
      component: () => import('../views/TheaterView.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

/** 路由守卫：未登录跳转登录页 */
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('minechat_access_token');
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' });
  } else if (!to.meta.requiresAuth && token) {
    next({ name: 'Chat' });
  } else {
    next();
  }
});

export default router;
