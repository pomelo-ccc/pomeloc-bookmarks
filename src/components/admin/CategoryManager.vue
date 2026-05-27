<template>
  <section class="pb-12">
    <div class="page-rule mb-6 flex items-end justify-between gap-6 pb-5">
      <div>
        <p class="text-[0.72rem] uppercase tracking-[0.24em] text-text-muted">Structure</p>
        <h2 class="mt-3 text-2xl font-medium tracking-tight text-text-primary">分类管理</h2>
      </div>
      <UiButton variant="ghost" @click="openAdd">
        <Plus class="mr-1 h-4 w-4" />
        新增
      </UiButton>
    </div>

    <div class="border border-border-subtle">
      <div
        v-for="(cat, idx) in categories"
        :key="cat.name"
        draggable="true"
        :class="[
          'group flex items-center gap-3 border-b border-border-subtle px-4 py-4 last:border-b-0',
          'cursor-grab transition-colors hover:bg-surface-raised active:cursor-grabbing',
          dragIdx === idx && 'opacity-50',
        ]"
        @dragstart="onDragStart(idx)"
        @dragover.prevent
        @drop="onDrop($event)"
        @dragend="dragIdx = null"
      >
        <GripVertical class="h-4 w-4 shrink-0 text-text-muted" />
        <div class="min-w-0 flex-1">
          <div class="text-sm text-text-primary">{{ cat.name }}</div>
          <div class="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">{{ cat.icon }}</div>
        </div>
        <button class="text-text-muted transition-colors hover:text-text-primary" @click="openEdit(cat)">
          <Pencil class="h-4 w-4" />
        </button>
        <button class="text-text-muted transition-colors hover:text-error" @click="confirmDelete(cat.name)">
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
    </div>

    <UiModal :show="showModal" :title="editCat ? '编辑分类' : '新增分类'" @close="showModal = false">
      <div class="space-y-5">
        <UiInput v-model="formName" label="名称" placeholder="输入分类名称" />
        <UiInput v-model="formIcon" label="图标" placeholder="Lucide 图标名，例如 folder" />
        <div class="flex justify-end gap-2 pt-4">
          <UiButton variant="ghost" @click="showModal = false">取消</UiButton>
          <UiButton variant="fill" @click="saveCategory">保存</UiButton>
        </div>
      </div>
    </UiModal>

    <UiModal :show="showDeleteConfirm" title="确认删除" @close="showDeleteConfirm = false">
      <p class="mb-4 text-sm leading-relaxed text-text-secondary">
        删除分类会同时移除该分类下的所有链接，这一步不可撤销。
      </p>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" @click="showDeleteConfirm = false">取消</UiButton>
        <UiButton variant="danger" @click="doDelete">删除</UiButton>
      </div>
    </UiModal>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { useLinksStore } from '@/stores'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiModal from '@/components/ui/UiModal.vue'

const linksStore = useLinksStore()

const categories = computed(() =>
  [...linksStore.categories].sort((a, b) => a.order - b.order)
)

const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editCat = ref<{ name: string; icon: string } | null>(null)
const formName = ref('')
const formIcon = ref('')
const dragIdx = ref<number | null>(null)
const deleteTarget = ref('')

function openAdd() {
  editCat.value = null
  formName.value = ''
  formIcon.value = 'folder'
  showModal.value = true
}

function openEdit(cat: { name: string; icon: string }) {
  editCat.value = cat
  formName.value = cat.name
  formIcon.value = cat.icon
  showModal.value = true
}

function saveCategory() {
  if (!formName.value.trim()) return

  if (editCat.value) {
    const index = linksStore.categories.findIndex(category => category.name === editCat.value!.name)
    if (index !== -1) {
      linksStore.categories[index] = {
        ...linksStore.categories[index],
        name: formName.value.trim(),
        icon: formIcon.value.trim(),
      }
      linksStore.persist()
    }
  } else {
    linksStore.addCategory({
      name: formName.value.trim(),
      icon: formIcon.value.trim() || 'folder',
      order: linksStore.categories.length,
    })
  }

  showModal.value = false
}

function confirmDelete(name: string) {
  deleteTarget.value = name
  showDeleteConfirm.value = true
}

function doDelete() {
  linksStore.deleteCategory(deleteTarget.value)
  showDeleteConfirm.value = false
}

function onDragStart(index: number) {
  dragIdx.value = index
}

function onDrop(event: DragEvent) {
  if (dragIdx.value === null) return
  const target = (event.target as HTMLElement).closest('[draggable]')
  if (!target) return

  const all = [...document.querySelectorAll('[draggable]')]
  const dropIndex = all.indexOf(target)
  if (dropIndex === -1 || dropIndex === dragIdx.value) return

  const sorted = [...categories.value]
  const [moved] = sorted.splice(dragIdx.value, 1)
  sorted.splice(dropIndex, 0, moved)
  linksStore.reorderCategories(sorted.map(category => category.name))
  dragIdx.value = null
}
</script>
