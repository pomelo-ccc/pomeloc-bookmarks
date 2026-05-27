<template>
  <div class="relative w-full">
    <div
      class="flex items-center gap-3 border border-border px-4 py-4 transition-colors"
      :class="isFocused ? 'border-text-secondary bg-surface-raised' : 'bg-surface'"
    >
      <Search class="h-4 w-4 shrink-0 text-text-muted" />
      <input
        ref="inputRef"
        :value="query"
        class="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        placeholder="搜索链接、标签或分类"
        @input="onInput"
        @focus="isFocused = true"
        @blur="onBlur"
      />
      <kbd class="hidden border border-border-subtle px-2 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-text-muted sm:inline-flex">
        Ctrl K
      </kbd>
    </div>

    <div
      v-if="shouldShowResults && results.length"
      class="absolute left-0 right-0 z-50 mt-2 border border-border bg-surface shadow-[var(--shadow-subtle)]"
    >
      <div class="max-h-96 overflow-y-auto">
        <button
          v-for="link in results.slice(0, 8)"
          :key="link.id"
          class="flex w-full items-start gap-3 border-b border-border-subtle px-4 py-3 text-left last:border-b-0 hover:bg-surface-raised"
          @click="$emit('select', link)"
        >
          <Globe class="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
          <div class="min-w-0 flex-1">
            <div class="text-sm text-text-primary">{{ link.title }}</div>
            <div class="mt-1 text-xs text-text-muted">{{ link.category }} · {{ link.url }}</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Globe, Search } from 'lucide-vue-next'
import type { LinkItem } from '@/types'

const props = defineProps<{
  query: string
  results: LinkItem[]
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  select: [link: LinkItem]
}>()

const isFocused = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const shouldShowResults = computed(() => isFocused.value && props.query.trim().length > 0)

function onInput(event: Event) {
  const next = (event.target as HTMLInputElement).value
  emit('update:query', next)
}

function onBlur() {
  window.setTimeout(() => {
    isFocused.value = false
  }, 150)
}
</script>
