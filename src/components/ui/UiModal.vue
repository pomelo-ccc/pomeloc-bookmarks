<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center px-4" @keydown.esc="close">
        <div class="absolute inset-0 bg-[oklch(0.14_0.004_85_/_0.12)]" @click="close" />
        <div class="relative z-10 w-full max-w-2xl border border-border bg-surface px-6 py-6 shadow-[var(--shadow-subtle)] sm:px-8">
          <div class="mb-6 flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
            <div>
              <p class="text-[0.72rem] uppercase tracking-[0.22em] text-text-muted">Dialog</p>
              <h2 class="mt-2 text-xl font-medium tracking-tight text-text-primary">{{ title }}</h2>
            </div>
            <button class="text-text-muted transition-colors hover:text-text-primary" @click="close">
              <X class="h-5 w-5" />
            </button>
          </div>

          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  show: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()

function close() {
  emit('close')
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 220ms cubic-bezier(0.2, 0, 0, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
