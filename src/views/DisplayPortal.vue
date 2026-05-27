<template>
  <div class="flex h-screen flex-col overflow-hidden">
    <AppHeader />

    <div class="flex flex-1 overflow-hidden">
      <AppSidebar />

      <main class="min-w-0 flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-[96rem] px-6 py-8 lg:px-10 lg:py-10">
          <section class="page-rule pb-10">
            <div class="grid gap-8 xl:grid-cols-[minmax(0,34rem)_minmax(24rem,1fr)] xl:items-end">
              <div>
                <p class="text-[0.72rem] uppercase tracking-[0.28em] text-text-muted">Personal Archive</p>
                <h1 class="mt-4 text-4xl font-medium tracking-tight text-text-primary sm:text-5xl">
                  Bookmarks
                </h1>
                <p class="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
                  用更少的视觉噪音，换来更清楚的索引结构、可持续的阅读节奏，以及更快的检索路径。
                </p>
              </div>

              <div class="space-y-4">
                <HeroSearch
                  v-model:query="searchQuery"
                  :results="searchResults"
                  @select="openLink"
                />

                <div class="grid gap-3 sm:grid-cols-3">
                  <div class="border border-border-subtle px-4 py-4">
                    <p class="text-[0.68rem] uppercase tracking-[0.2em] text-text-muted">Links</p>
                    <p class="mt-3 text-2xl font-medium tracking-tight text-text-primary">{{ linksStore.links.length }}</p>
                  </div>
                  <div class="border border-border-subtle px-4 py-4">
                    <p class="text-[0.68rem] uppercase tracking-[0.2em] text-text-muted">Categories</p>
                    <p class="mt-3 text-2xl font-medium tracking-tight text-text-primary">{{ linksStore.categories.length }}</p>
                  </div>
                  <div class="border border-border-subtle px-4 py-4">
                    <p class="text-[0.68rem] uppercase tracking-[0.2em] text-text-muted">Pinned</p>
                    <p class="mt-3 text-2xl font-medium tracking-tight text-text-primary">{{ linksStore.pinnedIds.length }}</p>
                  </div>
                </div>

                <div class="border border-border-subtle px-4 py-4 lg:hidden">
                  <label class="mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-muted">
                    Category
                  </label>
                  <select
                    :value="activeCategory ?? ''"
                    class="w-full border-b border-border bg-transparent pb-2 text-sm text-text-primary focus:outline-none"
                    @change="uiStore.setActiveCategory(($event.target as HTMLSelectElement).value || null)"
                  >
                    <option value="">全部分类</option>
                    <option v-for="cat in linksStore.categories" :key="cat.name" :value="cat.name">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <template v-if="filteredLinks.length === 0">
            <div class="pt-10">
              <UiEmptyState
                :icon="Search"
                :title="searchQuery ? '无匹配结果' : '暂无链接'"
                :description="searchQuery ? '换一个关键词，或者放宽分类限制。' : '进入管理页面后就可以开始整理你的第一批链接。'"
              >
                <template #action>
                  <router-link
                    v-if="!searchQuery"
                    to="/admin"
                    class="text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    打开管理页面
                  </router-link>
                </template>
              </UiEmptyState>
            </div>
          </template>

          <template v-else>
            <div class="pt-10">
              <PinnedLinks v-if="!uiStore.activeCategory && !searchQuery" />

              <section
                v-for="cat in visibleCategories"
                :key="cat.name"
                class="page-rule mb-10 pb-10 last:mb-0 last:pb-0 last:after:hidden"
              >
                <div class="mb-6 flex items-end justify-between gap-6">
                  <div>
                    <p class="text-[0.7rem] uppercase tracking-[0.24em] text-text-muted">Section</p>
                    <h2 class="mt-3 text-2xl font-medium tracking-tight text-text-primary">{{ cat.name }}</h2>
                  </div>
                  <p class="text-sm text-text-muted">{{ getLinksByCategory(cat.name).length }} links</p>
                </div>

                <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <LinkCard
                    v-for="link in getLinksByCategory(cat.name)"
                    :key="link.id"
                    :link="link"
                    class="stagger-item"
                  />
                </div>
              </section>
            </div>
          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { useLinksStore, useUiStore } from '@/stores'
import { useSearch } from '@/composables/useSearch'
import { useKeyboard } from '@/composables/useKeyboard'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import HeroSearch from '@/components/display/HeroSearch.vue'
import PinnedLinks from '@/components/display/PinnedLinks.vue'
import LinkCard from '@/components/display/LinkCard.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'

const linksStore = useLinksStore()
const uiStore = useUiStore()

const searchQuery = ref('')
const { results: searchResults } = useSearch(computed(() => linksStore.links), searchQuery)

const activeCategory = computed(() => uiStore.activeCategory)

const filteredLinks = computed(() => {
  let links = searchResults.value
  if (activeCategory.value) {
    links = links.filter(link => link.category === activeCategory.value)
  }
  return links
})

const visibleCategories = computed(() => {
  const names = new Set(filteredLinks.value.map(link => link.category))
  return linksStore.categories
    .filter(category => names.has(category.name))
    .sort((a, b) => a.order - b.order)
})

function getLinksByCategory(name: string) {
  return filteredLinks.value.filter(link => link.category === name)
}

function openLink(link: { url: string }) {
  window.open(link.url, '_blank')
  searchQuery.value = ''
}

useKeyboard()
</script>
