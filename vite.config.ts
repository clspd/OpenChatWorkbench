import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          comments: true,
          // isCustomElement: (tag) => tag.includes('-') && (!(/^(a|router|dialog)-/.test(tag))), // exclude Ant Design Vue components
          isCustomElement: (tag) => ['common-file-preview'].includes(tag),
        },
      }
    }),
    // vueDevTools(),
    Components({
      resolvers: [AntDesignVueResolver({
        importStyle: false, // css in js
        resolveIcons: true,
      })],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'set-cookie': 'sys.cookies.enabled=true; Path=/; Max-Age=31536000; Secure',
    },
  },
  build: {
    sourcemap: true,
    manifest: "internal/manifest.json",
    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        recovery: resolve(__dirname, 'recovery.html'),
        webcontainers: resolve(__dirname, 'webcontainers.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].s.js',
        chunkFileNames: 'assets/[name]-[hash].s.js',
        assetFileNames: 'assets/[name]-[hash].s.[ext]',
      },
    },
  },
})
