<template>
  <div class="mb-12">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-serif text-text-primary">链接管理</h2>
      <UiButton variant="fill" @click="$emit('add')">
        <Plus class="w-4 h-4 mr-1" /> 新增链接
      </UiButton>
    </div>

    <div v-if="links.length === 0" class="py-8">
      <UiEmptyState :icon="Link" title="暂无链接" description="添加你的第一个链接" />
    </div>

    <div v-else>
      <div class="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-text-muted border-b border-border-subtle">
        <div class="col-span-4">标题</div>
        <div class="col-span-3">分类</div>
        <div class="col-span-3">标签</div>
        <div class="col-span-2 text-right">操作</div>
      </div>

      <div
        v-for="link in links"
        :key="link.id"
        class="group grid grid-cols-12 gap-4 px-4 py-3 items-center
               hover:bg-brand-subtle transition-colors duration-fast ease-smooth"
      >
        <div class="col-span-4">
          <a :href="link.url" target="_blank" rel="noopener noreferrer" class="text-sm text-text-primary hover:text-brand transition-colors">
            {{ link.title }}
          </a>
          <p v-if="link.desc" class="text-xs text-text-muted mt-0.5 truncate">{{ link.desc }}</p>
        </div>
        <div class="col-span-3 text-xs text-text-secondary">{{ link.category }}</div>
        <div class="col-span-3 flex flex-wrap gap-1">
          <UiBadge v-for="tag in link.tags.slice(0, 2)" :key="tag" :label="tag" />
          <span v-if="link.tags.length > 2" class="text-xs text-text-muted">+{{ link.tags.length - 2 }}</span>
        </div>
        <div class="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-fast ease-fade">
          <button class="p-1 text-text-muted hover:text-text-primary transition-colors" @click="$emit('edit', link)">
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button class="p-1 text-text-muted/40 hover:text-accent-danger transition-colors" @click="confirmDelete(link.id)">
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <UiModal :show="showDeleteConfirm" title="确认删除" @close="showDeleteConfirm = false">
      <p class="text-sm text-text-secondary mb-4">确定要删除此链接吗？</p>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" @click="showDeleteConfirm = false">取消</UiButton>
        <UiButton variant="danger" @click="$emit('delete', deleteTargetId); showDeleteConfirm = false">删除</UiButton>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Pencil, Trash2, Link } from 'lucide-vue-next'
import type { LinkItem } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import UiModal from '@/components/ui/UiModal.vue'

const props = defineProps<{
  links: LinkItem[]
}>()

defineEmits<{
  add: []
  edit: [link: LinkItem]
  delete: [id: string]
}>()

const links = computed(() => props.links)

const showDeleteConfirm = ref(false)
const deleteTargetId = ref('')

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}
</script>
