import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    allowedHosts: ['.monkeycode-ai.online']
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        bookmarks: fileURLToPath(new URL('./bookmarks/index.html', import.meta.url)),
      },
      output: {
        manualChunks: {
          'pinyin-pro': ['pinyin-pro'],
          'lucide-vue-next': ['lucide-vue-next']
        }
      }
    }
  }
})
