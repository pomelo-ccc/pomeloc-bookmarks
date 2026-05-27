<template>
  <section class="page-rule mb-12 pb-10" v-if="pinnedLinks.length">
    <div class="mb-6 flex items-end justify-between gap-6">
      <div>
        <p class="text-[0.72rem] uppercase tracking-[0.26em] text-text-muted">Starred</p>
        <h2 class="mt-3 text-2xl font-medium tracking-tight text-text-primary">常用入口</h2>
      </div>
      <p class="max-w-md text-sm leading-relaxed text-text-secondary">
        最常访问的链接应该最容易抵达，所以这里保留最短的路径。
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="link in pinnedLinks" :key="link.id" class="stagger-item">
        <a
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="card-link group relative"
          @click="linksStore.incrementClick(link.id)"
        >
          <button
            class="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center border border-border bg-surface-raised text-text-primary transition-colors hover:border-text-secondary"
            title="取消常用"
            @click.prevent="linksStore.togglePin(link.id)"
          >
            <Star class="h-3.5 w-3.5" fill="currentColor" />
          </button>

          <div class="pr-10">
            <p class="text-[0.68rem] uppercase tracking-[0.22em] text-text-muted">Pinned</p>
            <h3 class="mt-3 text-xl font-medium tracking-tight text-text-primary transition-colors group-hover:text-brand">
              {{ link.title }}
            </h3>
          </div>

          <p v-if="link.desc" class="max-w-[34ch] text-sm leading-relaxed text-text-secondary">
            {{ link.desc }}
          </p>

          <div class="mt-auto border-t border-border-subtle pt-4 text-xs uppercase tracking-[0.18em] text-text-muted">
            Open resource
          </div>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'
import { useLinksStore } from '@/stores'

const linksStore = useLinksStore()

const pinnedLinks = computed(() =>
  linksStore.pinnedIds
    .map(id => linksStore.links.find(link => link.id === id))
    .filter((link): link is NonNullable<typeof link> => Boolean(link))
    .slice(0, 5)
)
</script>
