<template>
  <div class="border border-border-subtle px-6 py-16 text-center">
    <component :is="icon" class="mx-auto h-8 w-8 text-text-muted" />
    <p class="mt-5 text-lg font-medium tracking-tight text-text-primary">{{ title }}</p>
    <p v-if="description" class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
      {{ description }}
    </p>
    <div class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description?: string
}>()
</script>
