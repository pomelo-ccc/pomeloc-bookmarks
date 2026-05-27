<template>
  <div class="w-full">
    <label v-if="label" class="mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-muted">
      {{ label }}
      <span v-if="required" class="text-error">*</span>
    </label>

    <input
      v-if="type !== 'textarea'"
      v-bind="attrs"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :class="[
        'w-full border-b bg-transparent pb-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none',
        'transition-colors',
        error ? 'border-error' : 'border-border',
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <textarea
      v-else
      v-bind="attrs"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :class="[
        'w-full resize-none border-b bg-transparent pb-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none',
        'transition-colors',
        error ? 'border-error' : 'border-border',
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />

    <p v-if="error" class="mt-2 text-xs text-error">{{ error }}</p>
    <p v-else-if="hint" class="mt-2 text-xs text-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false,
})

defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  hint?: string
  type?: string
  rows?: number
  required?: boolean
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const attrs = useAttrs()
</script>
