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
      name: 'new-chat',
      component: () => import('@/views/NewChat.vue'),
    },
    {
      path: '/chat/c/:chatId',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
    },
    {
      path: '/settings/',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
    },
    {
      path: '/settings/:settingId',
      name: 'setting',
      component: () => import('@/views/Settings.vue'),
    },
    {
      path: '/about/',
      name: 'about',
      component: () => import('@/views/About.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    }
  ],
})

export default router
