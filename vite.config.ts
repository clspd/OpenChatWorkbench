import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
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
          isCustomElement: (tag) => /^(common|sl|ocw)-/.test(tag),
        },
      }
    }),
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
    },
  },
  build: {
    sourcemap: true,
    manifest: "internal/manifest.json",
    rolldownOptions: {
      input: getInput({
        main: 'index.html',
        recovery: 'recovery.html',
        webview: 'webview.html',
        webcontainers: 'webcontainers.html',
      }),
      output: {
        entryFileNames: 'assets/[name]-[hash].s.js',
        chunkFileNames: 'assets/[name]-[hash].s.js',
        assetFileNames: 'assets/[name]-[hash].s.[ext]',
      },
      external: [
        'katex',
      ],
    },
    modulePreload: {
      polyfill: false,
      resolveDependencies: () => [],
    },
  },
})

function getInput(config: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(config).map(([k, v]) => [k, resolve(__dirname, v)])
  )
}
