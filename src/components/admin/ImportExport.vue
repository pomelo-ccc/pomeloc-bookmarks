<template>
  <section class="pb-12">
    <div class="page-rule mb-6 pb-5">
      <p class="text-[0.72rem] uppercase tracking-[0.24em] text-text-muted">Data</p>
      <h2 class="mt-3 text-2xl font-medium tracking-tight text-text-primary">数据操作</h2>
      <p class="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
        导入、导出和清空都保留成直接动作，但视觉上维持克制，避免让操作本身显得比内容更重要。
      </p>
    </div>

    <div class="flex flex-wrap gap-3">
      <UiButton variant="ghost" @click="triggerImport">
        <Download class="mr-1 h-4 w-4" />
        导入 JSON
      </UiButton>
      <UiButton variant="ghost" @click="exportData">
        <Upload class="mr-1 h-4 w-4" />
        导出 JSON
      </UiButton>
      <UiButton variant="danger" @click="showConfirm = true">
        <Trash2 class="mr-1 h-4 w-4" />
        清空所有
      </UiButton>
      <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleImport" />
    </div>

    <UiModal :show="showConfirm" title="确认清空" @close="showConfirm = false">
      <p class="mb-2 text-sm leading-relaxed text-text-secondary">
        此操作将删除所有链接和分类数据，不可撤销。
      </p>
      <p class="mb-6 text-xs text-text-muted">建议先导出一份备份文件。</p>
      <div class="flex justify-end gap-2">
        <UiButton variant="ghost" @click="showConfirm = false">取消</UiButton>
        <UiButton variant="danger" @click="doClear">确认清空</UiButton>
      </div>
    </UiModal>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Download, Trash2, Upload } from 'lucide-vue-next'
import { useLinksStore } from '@/stores'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'

const linksStore = useLinksStore()

const showConfirm = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

function handleImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)
      if (data.links && data.categories) {
        linksStore.importData(data)
      }
    } catch {
      alert('无效的 JSON 文件')
    }
  }

  reader.readAsText(file)
  if (fileInput.value) fileInput.value.value = ''
}

function exportData() {
  const data = linksStore.exportData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `linkhub-export-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function doClear() {
  linksStore.clearAll()
  showConfirm.value = false
}
</script>
