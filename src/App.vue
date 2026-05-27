<script setup lang="ts">
import { onMounted } from 'vue'
import { useLinksStore, useUiStore } from '@/stores'
import { seedData } from '@/data/seed'

const linksStore = useLinksStore()
const uiStore = useUiStore()

onMounted(() => {
  linksStore.init({
    links: seedData.links,
    categories: seedData.categories,
    pinnedIds: seedData.pinnedIds,
  })
  uiStore.initTheme()
})
</script>

<template>
  <router-view />
</template>
