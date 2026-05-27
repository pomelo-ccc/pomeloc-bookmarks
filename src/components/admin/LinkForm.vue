<template>
  <UiModal :show="show" :title="isEdit ? '编辑链接' : '新增链接'" @close="$emit('close')">
    <div class="space-y-5">
      <UiInput v-model="form.title" label="标题" placeholder="链接标题" required :error="errors.title" />
      <UiInput
        v-model="form.url"
        label="URL"
        placeholder="https://..."
        hint="避免存放敏感信息。"
        required
        :error="errors.url"
      />
      <UiInput v-model="form.desc" label="描述" placeholder="一句话说明它为什么重要" />

      <div class="grid gap-5 md:grid-cols-2">
        <div>
          <label class="mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-muted">
            分类 <span class="text-error">*</span>
          </label>
          <select
            v-model="form.category"
            :class="[
              'w-full border-b bg-transparent pb-3 text-sm text-text-primary focus:outline-none',
              errors.category ? 'border-error' : 'border-border',
            ]"
          >
            <option value="" disabled class="bg-[var(--surface-raised)]">选择分类</option>
            <option v-for="cat in categories" :key="cat.name" :value="cat.name" class="bg-[var(--surface-raised)]">
              {{ cat.name }}
            </option>
          </select>
          <p v-if="errors.category" class="mt-2 text-xs text-error">{{ errors.category }}</p>
        </div>

        <UiInput v-model="tagInput" label="标签" placeholder="输入后回车添加" @keydown.enter.prevent="addTag" />
      </div>

      <div v-if="form.tags.length" class="flex flex-wrap gap-2">
        <span
          v-for="(tag, index) in form.tags"
          :key="tag"
          class="inline-flex items-center gap-2 border border-border-subtle px-3 py-1 text-xs uppercase tracking-[0.14em] text-text-secondary"
        >
          {{ tag }}
          <button class="text-text-muted transition-colors hover:text-text-primary" @click="form.tags.splice(index, 1)">
            <X class="h-3 w-3" />
          </button>
        </span>
      </div>

      <p v-if="submitError" class="text-sm text-error">{{ submitError }}</p>

      <div class="flex justify-end gap-2 border-t border-border-subtle pt-5">
        <UiButton variant="ghost" @click="$emit('close')">取消</UiButton>
        <UiButton variant="fill" @click="save">保存</UiButton>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { Category, LinkItem } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiModal from '@/components/ui/UiModal.vue'

const props = defineProps<{
  show: boolean
  link?: LinkItem | null
  categories: Category[]
}>()

const emit = defineEmits<{
  close: []
  save: [data: { title: string; url: string; desc: string; category: string; tags: string[] }]
}>()

const isEdit = ref(false)
const form = ref({ title: '', url: '', desc: '', category: '', tags: [] as string[] })
const tagInput = ref('')
const errors = reactive({ title: '', url: '', category: '' })
const submitError = ref('')

watch(() => props.show, () => {
  errors.title = ''
  errors.url = ''
  errors.category = ''
  submitError.value = ''

  if (props.link) {
    isEdit.value = true
    form.value = {
      title: props.link.title,
      url: props.link.url,
      desc: props.link.desc || '',
      category: props.link.category,
      tags: [...props.link.tags],
    }
  } else {
    isEdit.value = false
    form.value = { title: '', url: '', desc: '', category: '', tags: [] }
  }

  tagInput.value = ''
})

function addTag() {
  const next = tagInput.value.trim()
  if (next && !form.value.tags.includes(next)) {
    form.value.tags.push(next)
  }
  tagInput.value = ''
}

function validate() {
  errors.title = ''
  errors.url = ''
  errors.category = ''
  let valid = true

  if (!form.value.title.trim()) {
    errors.title = '标题不能为空'
    valid = false
  }

  if (!form.value.url.trim()) {
    errors.url = 'URL 不能为空'
    valid = false
  } else {
    try {
      new URL(form.value.url)
    } catch {
      errors.url = '请输入有效的 URL'
      valid = false
    }
  }

  if (!form.value.category) {
    errors.category = '请选择分类'
    valid = false
  }

  return valid
}

function save() {
  submitError.value = ''
  if (!validate()) {
    submitError.value = '请先修正上方错误。'
    return
  }

  emit('save', {
    title: form.value.title.trim(),
    url: form.value.url.trim(),
    desc: form.value.desc.trim(),
    category: form.value.category,
    tags: form.value.tags,
  })
}
</script>
