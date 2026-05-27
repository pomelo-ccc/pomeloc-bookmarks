<template>
  <button
    :class="[
      'inline-flex items-center justify-center gap-2 border text-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
      variant === 'fill' && 'border-text-primary bg-text-primary px-4 py-2 text-surface hover:border-brand-hover hover:bg-brand-hover',
      variant === 'ghost' && 'border-border px-3 py-2 text-text-secondary hover:border-text-secondary hover:text-text-primary',
      variant === 'text' && 'border-transparent px-1 py-1 text-text-secondary underline-offset-4 hover:text-text-primary hover:underline',
      variant === 'danger' && 'border-error bg-error-subtle px-4 py-2 text-error hover:border-error hover:bg-error-subtle',
      disabled && 'pointer-events-none opacity-40',
    ]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'fill' | 'ghost' | 'text' | 'danger'
  disabled?: boolean
}>()

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>
