<template>
  <header
    class="shrink-0 border-b border-border-subtle"
    :style="{ backgroundColor: 'var(--header-bg)' }"
  >
    <div class="mx-auto flex min-h-16 w-full max-w-[96rem] items-center gap-5 px-6 py-3 lg:px-10">
      <a
        href="/"
        data-home-link="portal"
        aria-label="返回首页"
        title="返回首页"
        class="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-border-subtle text-text-secondary transition-colors hover:border-border hover:text-text-primary"
      >
        <House class="h-4 w-4" />
      </a>

      <div class="min-w-0">
        <router-link
          to="/"
          class="text-sm font-medium uppercase tracking-[0.32em] text-text-primary transition-colors hover:text-brand"
        >
          Pomeloc
        </router-link>
        <p class="mt-1 text-[0.7rem] uppercase tracking-[0.24em] text-text-muted">
          {{ route.name === 'admin' ? 'Management Surface' : 'Quiet Archive' }}
        </p>
      </div>

      <div class="hidden items-center gap-4 text-[0.72rem] uppercase tracking-[0.22em] text-text-muted md:flex">
        <router-link to="/" class="transition-colors hover:text-text-primary">
          Library
        </router-link>
        <router-link to="/admin" class="transition-colors hover:text-text-primary">
          Admin
        </router-link>
      </div>

      <div class="min-w-0 flex-1">
        <slot name="search" />
      </div>

      <div class="ml-auto flex items-center gap-3 text-xs text-text-muted">
        <span class="hidden font-mono tracking-[0.18em] md:inline">{{ time }}</span>

        <button
          class="inline-flex h-8 items-center gap-2 border border-border-subtle px-3 text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary transition-colors hover:border-border hover:text-text-primary"
          :title="uiStore.theme === 'dark' ? '切换到亮色' : '切换到暗色'"
          @click="uiStore.toggleTheme()"
        >
          <Sun v-if="uiStore.theme === 'dark'" class="h-3.5 w-3.5" />
          <Moon v-else class="h-3.5 w-3.5" />
          <span>{{ uiStore.theme === 'dark' ? 'Light' : 'Dark' }}</span>
        </button>

        <button
          v-if="!uiStore.isAdmin"
          class="inline-flex h-8 items-center border border-transparent px-1 text-[0.72rem] uppercase tracking-[0.18em] text-text-muted transition-colors hover:text-text-primary"
          @click="uiStore.setAdmin(true)"
        >
          Unlock
        </button>

        <router-link
          v-else
          to="/admin"
          class="inline-flex h-8 items-center border border-transparent px-1 text-[0.72rem] uppercase tracking-[0.18em] text-text-secondary transition-colors hover:text-text-primary"
        >
          Manage
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { House, Moon, Sun } from 'lucide-vue-next'
import { useUiStore } from '@/stores'

const uiStore = useUiStore()
const route = useRoute()

const time = ref('')
let timer: number

function updateTime() {
  const now = new Date()
  time.value = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

onMounted(() => {
  updateTime()
  timer = window.setInterval(updateTime, 10_000)
})

onUnmounted(() => clearInterval(timer))
</script>
