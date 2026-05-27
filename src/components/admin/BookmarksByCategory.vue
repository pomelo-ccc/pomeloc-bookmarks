<template>
  <div class="mb-8">
    <template v-if="categories.length === 0">
      <UiEmptyState :icon="Folder" title="暂无分类" description="先在分类管理中创建分类" />
    </template>
    <template v-else>
      <div v-for="cat in categories" :key="cat.name" class="mb-8">
        <h3 class="text-xl font-serif mb-3 flex items-center gap-2">
          <component :is="getIcon(cat.icon)" class="w-4 h-4 text-text-muted" />
          {{ cat.name }}
          <span class="text-xs text-text-muted font-sans">({{ getLinks(cat.name).length }})</span>
        </h3>
        <div class="flex gap-3 overflow-x-auto pb-2">
          <template v-if="getLinks(cat.name).length === 0">
            <div class="text-xs text-text-muted/40 py-4 px-2">暂无书签</div>
          </template>
          <a
            v-for="link in getLinks(cat.name)"
            :key="link.id"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex-shrink-0 w-72 p-3 rounded-md border border-border-subtle
                   hover:border-brand/30 transition-all duration-fast ease-smooth no-underline group"
          >
            <div class="flex items-center gap-2 mb-1.5">
              <Globe class="w-3.5 h-3.5 text-text-muted group-hover:text-brand transition-colors" />
              <span class="text-sm text-text-primary truncate group-hover:text-brand transition-colors">
                {{ link.title }}
              </span>
            </div>
            <p v-if="link.desc" class="text-xs text-text-muted line-clamp-1">{{ link.desc }}</p>
            <div v-if="link.tags.length" class="flex flex-wrap gap-1 mt-1.5">
              <UiBadge v-for="tag in link.tags.slice(0, 2)" :key="tag" :label="tag" />
            </div>
          </a>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Folder, Globe, Component as LucideComponent, Server, Database, Code, Settings } from 'lucide-vue-next'
import { useLinksStore } from '@/stores'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import UiBadge from '@/components/ui/UiBadge.vue'

const linksStore = useLinksStore()

const categories = computed(() =>
  [...linksStore.categories].sort((a, b) => a.order - b.order)
)

function getLinks(name: string) {
  return linksStore.links.filter(l => l.category === name)
}

const iconMap: Record<string, Component> = {
  component: LucideComponent,
  folder: Folder,
  server: Server,
  database: Database,
  code: Code,
  settings: Settings,
}

function getIcon(name: string): Component {
  return iconMap[name] || Folder
}
</script>
