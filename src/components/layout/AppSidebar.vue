<template>
  <nav class="hidden w-64 shrink-0 border-r border-border-subtle bg-[var(--sidebar-bg)] lg:flex lg:flex-col">
    <div class="page-rule px-6 py-8">
      <p class="text-[0.72rem] uppercase tracking-[0.26em] text-text-muted">Index</p>
      <h2 class="mt-4 text-lg font-medium tracking-tight text-text-primary">Categories</h2>
      <p class="mt-2 max-w-[18rem] text-sm leading-relaxed text-text-secondary">
        用清晰的分类减少搜索范围，让书签更像一本可翻阅的索引。
      </p>
    </div>

    <ul class="flex-1 space-y-1 overflow-y-auto px-4 py-4">
      <li>
        <button
          :class="[
            'flex w-full items-center justify-between gap-3 border border-transparent px-3 py-3 text-left text-sm transition-colors',
            activeCategory === null
              ? 'border-border bg-surface-raised text-text-primary'
              : 'text-text-secondary hover:border-border-subtle hover:bg-surface-raised hover:text-text-primary',
          ]"
          @click="uiStore.setActiveCategory(null)"
        >
          <span>全部</span>
          <span class="font-mono text-[0.7rem] text-text-muted">{{ linksStore.links.length }}</span>
        </button>
      </li>

      <li v-for="cat in sortedCategories" :key="cat.name">
        <button
          :class="[
            'flex w-full items-center justify-between gap-3 border border-transparent px-3 py-3 text-left text-sm transition-colors',
            activeCategory === cat.name
              ? 'border-border bg-surface-raised text-text-primary'
              : 'text-text-secondary hover:border-border-subtle hover:bg-surface-raised hover:text-text-primary',
          ]"
          @click="uiStore.setActiveCategory(cat.name)"
        >
          <span class="truncate">{{ cat.name }}</span>
          <span class="font-mono text-[0.7rem] text-text-muted">{{ counts.get(cat.name) ?? 0 }}</span>
        </button>
      </li>
    </ul>

    <div class="page-rule px-6 py-6">
      <p class="text-[0.72rem] uppercase tracking-[0.26em] text-text-muted">Focus</p>
      <p class="mt-2 text-sm leading-relaxed text-text-secondary">
        少量边框，更多层级。让内容自己说话。
      </p>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore, useLinksStore } from '@/stores'

const uiStore = useUiStore()
const linksStore = useLinksStore()

const sortedCategories = computed(() =>
  [...linksStore.categories].sort((a, b) => a.order - b.order)
)

const counts = computed(() =>
  new Map(
    linksStore.categories.map(cat => [
      cat.name,
      linksStore.links.filter(link => link.category === cat.name).length,
    ])
  )
)

const activeCategory = computed(() => uiStore.activeCategory)
</script>
