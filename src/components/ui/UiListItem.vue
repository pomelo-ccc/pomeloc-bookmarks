<template>
  <div
    class="group relative flex items-start gap-4 px-4 py-3 rounded-sm cursor-pointer
           transition-colors duration-fast ease-smooth"
    @click="onClick"
  >
    <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-brand
                transition-colors duration-fast ease-smooth" />
    <div class="flex items-center justify-center w-5 h-5 shrink-0 mt-0.5 text-text-muted group-hover:text-text-secondary">
      <component :is="icon" class="w-4 h-4" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-sm text-text-primary truncate">{{ title }}</div>
      <div v-if="desc" class="text-xs text-text-muted mt-0.5 truncate">{{ desc }}</div>
    </div>
    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-fast ease-fade shrink-0">
      <button
        class="p-1 text-text-muted hover:text-text-primary transition-colors"
        title="Copy URL"
        @click.stop="onCopy"
      >
        <Copy class="w-3.5 h-3.5" />
      </button>
      <a
        :href="url"
        target="_blank"
        rel="noopener noreferrer"
        class="p-1 text-text-muted hover:text-text-primary transition-colors"
        title="Open in new tab"
        @click.stop
      >
        <ExternalLink class="w-3.5 h-3.5" />
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { Copy, ExternalLink } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  url: string
  desc?: string
  icon: Component
}>()

const emit = defineEmits<{
  click: []
  copy: [url: string]
}>()

function onClick() {
  emit('click')
}

async function onCopy() {
  try {
    await navigator.clipboard.writeText(props.url)
  } catch {
    /* fallback */
  }
  emit('copy', props.url)
}
</script>
