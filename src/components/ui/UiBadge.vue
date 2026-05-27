<template>
  <span
    class="inline-flex items-center border border-border-subtle px-2 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-text-muted transition-colors hover:border-border hover:text-text-secondary"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>
