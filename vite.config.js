import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const entry = p => fileURLToPath(new URL(p, import.meta.url))

// 构建时间：注入到首页报头，避免写死日期
const buildStamp = new Date().toISOString()

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'inject-build-stamp',
      transformIndexHtml(html) {
        return html.replaceAll('%BUILD_STAMP%', buildStamp).replace(
          '%BUILD_STAMP_TEXT%',
          buildStamp.slice(0, 16).replace('T', ' ')
        )
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    allowedHosts: ['.monkeycode-ai.online'],
  },
  build: {
    rollupOptions: {
      input: {
        main: entry('./index.html'),
        bookmarks: entry('./bookmarks/index.html'),
        console: entry('./console/index.html'),
      },
      output: {
        manualChunks: {
          'pinyin-pro': ['pinyin-pro'],
          'lucide-vue-next': ['lucide-vue-next'],
        },
      },
    },
  },
})
