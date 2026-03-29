import { createRouter, createWebHashHistory, type RouteLocationNormalizedLoadedGeneric } from 'vue-router'
import yn from 'yn';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'new-chat',
      component: () => import('@/views/NewChat.vue'),
    },
    {
      path: '/chat/',
      redirect: '/',
    },
    {
      path: '/chat/c/:chatId',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
      meta: {
        keepAliveComponentName: 'ChatView'
      },
    },
    {
      path: '/workspace/new',
      name: 'new-workspace',
      component: () => import('@/views/NewWorkspace.vue'),
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
      props: true,
    },
    {
      path: '/about/',
      name: 'about',
      component: () => import('@/views/About.vue'),
    },
    {
      path: '/webview',
      name: 'webview',
      component: () => import('@/views/WebViewRoute.vue'),
      props: route => ({
        url: route.query.src,
        title: route.query.title,
        navhide: !!yn(route.query.navhide),
        ignoreIsolation: !!yn(route.query.ignoreIsolation),
      }),
    },
    {
      path: '/interop/data-import-and-export',
      name: 'data-import-and-export',
      component: () => import('@/views/DataImportAndExport.vue'),
    },
    {
      path: '/debug/file-browser',
      component: () => import('@/views/FileBrowser.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
    }
  ],
})

export default router

export let previousPage: RouteLocationNormalizedLoadedGeneric;

router.beforeEach((to, from, next) => (previousPage = from, void next()));
