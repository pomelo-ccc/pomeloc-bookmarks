<template>
  <a
    :href="link.url"
    target="_blank"
    rel="noopener noreferrer"
    class="card-link group relative cursor-pointer"
    @click="linksStore.incrementClick(link.id)"
  >
    <button
      :class="[
        'absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center border transition-colors',
        isPinned
          ? 'border-border bg-surface-raised text-text-primary'
          : 'border-transparent text-text-muted opacity-0 group-hover:opacity-100 hover:border-border-subtle hover:text-text-secondary',
      ]"
      :title="isPinned ? '取消常用' : '标记为常用'"
      @click.prevent="linksStore.togglePin(link.id)"
    >
      <Star class="h-3.5 w-3.5" :fill="isPinned ? 'currentColor' : 'none'" />
    </button>

    <div class="pr-10">
      <p class="text-[0.68rem] uppercase tracking-[0.22em] text-text-muted">
        {{ link.category }}
      </p>
      <h3 class="mt-3 text-lg font-medium tracking-tight text-text-primary transition-colors group-hover:text-brand">
        {{ link.title }}
      </h3>
    </div>

    <p v-if="link.desc" class="max-w-[34ch] text-sm leading-relaxed text-text-secondary">
      {{ link.desc }}
    </p>

    <div v-if="link.tags.length" class="flex flex-wrap gap-2">
      <UiBadge v-for="tag in link.tags.slice(0, 3)" :key="tag" :label="tag" />
    </div>

    <div class="mt-auto flex items-center justify-between gap-4 border-t border-border-subtle pt-4 text-xs text-text-muted">
      <span class="truncate">{{ truncateUrl(link.url) }}</span>
      <div class="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button class="transition-colors hover:text-text-primary" title="复制链接" @click.prevent="copyUrl">
          <Copy class="h-3.5 w-3.5" />
        </button>
        <span class="text-text-muted">
          <ExternalLink class="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Copy, ExternalLink, Star } from 'lucide-vue-next'
import type { LinkItem } from '@/types'
import { useLinksStore } from '@/stores'
import UiBadge from '@/components/ui/UiBadge.vue'

const props = defineProps<{
  link: LinkItem
}>()

const linksStore = useLinksStore()

const isPinned = computed(() => linksStore.pinnedIds.includes(props.link.id))

function truncateUrl(url: string): string {
  try {
    const next = new URL(url)
    return `${next.hostname}${next.pathname === '/' ? '' : next.pathname.slice(0, 24)}`
  } catch {
    return url.slice(0, 36)
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(props.link.url)
  } catch {
    // Keep silent in browsers where clipboard access is blocked.
  }
}
</script>
