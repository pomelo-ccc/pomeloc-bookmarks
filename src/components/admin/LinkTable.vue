<template>
  <div>
    <div v-if="links.length === 0" class="px-6 py-12">
      <UiEmptyState :icon="Link" title="暂无链接" description="添加你的第一条链接后，这里会开始形成有秩序的索引。" />
    </div>

    <div v-else>
      <div class="grid grid-cols-12 gap-4 border-b border-border-subtle px-4 py-3 text-[0.72rem] uppercase tracking-[0.18em] text-text-muted">
        <div class="col-span-4">标题</div>
        <div class="col-span-2">分类</div>
        <div class="col-span-2">标签</div>
        <div class="col-span-1 text-center">常用</div>
        <div class="col-span-3 text-right">操作</div>
      </div>

      <div
        v-for="link in links"
        :key="link.id"
        class="group grid grid-cols-12 gap-4 border-b border-border-subtle px-4 py-4 text-sm last:border-b-0 hover:bg-surface-raised"
      >
        <div class="col-span-12 sm:col-span-4">
          <a :href="link.url" target="_blank" rel="noopener noreferrer" class="text-text-primary transition-colors hover:text-brand">
            {{ link.title }}
          </a>
          <p v-if="link.desc" class="mt-1 text-xs leading-relaxed text-text-muted">{{ link.desc }}</p>
        </div>

        <div class="col-span-4 sm:col-span-2 text-text-secondary">{{ link.category }}</div>

        <div class="col-span-8 flex flex-wrap gap-2 sm:col-span-2">
          <UiBadge v-for="tag in link.tags.slice(0, 2)" :key="tag" :label="tag" />
          <span v-if="link.tags.length > 2" class="text-xs text-text-muted">+{{ link.tags.length - 2 }}</span>
        </div>

        <div class="col-span-2 flex items-center justify-center sm:col-span-1">
          <button
            :class="[
              'transition-colors',
              isPinned(link.id) ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
            ]"
            title="标记为常用"
            @click="$emit('toggle-pin', link.id)"
          >
            <Star class="h-4 w-4" :fill="isPinned(link.id) ? 'currentColor' : 'none'" />
          </button>
        </div>

        <div class="col-span-10 flex items-center justify-end gap-2 sm:col-span-3">
          <button class="text-text-muted transition-colors hover:text-text-primary" @click="$emit('edit', link)">
            <Pencil class="h-4 w-4" />
          </button>
          <button class="text-text-muted transition-colors hover:text-error" @click="confirmDelete(link.id)">
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <UiModal :show="showDeleteConfirm" title="确认删除" @close="showDeleteConfirm = false">
      <p class="mb-4 text-sm leading-relaxed text-text-secondary">确定要删除此链接吗？</p>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" @click="showDeleteConfirm = false">取消</UiButton>
        <UiButton variant="danger" @click="doDelete">删除</UiButton>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Link, Pencil, Star, Trash2 } from 'lucide-vue-next'
import type { LinkItem } from '@/types'
import { useLinksStore } from '@/stores'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import UiModal from '@/components/ui/UiModal.vue'

defineProps<{
  links: LinkItem[]
}>()

const emit = defineEmits<{
  edit: [link: LinkItem]
  delete: [id: string]
  'toggle-pin': [id: string]
}>()

const linksStore = useLinksStore()

const isPinned = computed(() => (id: string) => linksStore.pinnedIds.includes(id))

const showDeleteConfirm = ref(false)
const deleteTargetId = ref('')

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

function doDelete() {
  emit('delete', deleteTargetId.value)
  showDeleteConfirm.value = false
}
</script>
