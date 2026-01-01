import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/chat',
    },
    {
      path: '/chat',
      component: () => import('@/views/NewChat.vue'),
    },
    {
      path: '/chat/c/:chatId',
      component: () => import('@/views/ChatView.vue'),
    },
    {
      path: '/settings/',
      component: () => import('@/views/Settings.vue'),
    },
    {
      path: '/settings/:settingId',
      component: () => import('@/views/Settings.vue'),
    },
    {
      path: '/about/',
      component: () => import('@/views/About.vue'),
    },
    {
      // 404
      path: '/:pathMatch(.*)*',
      component: () => import('@/views/NotFound.vue'),
    }
  ],
})

export default router
