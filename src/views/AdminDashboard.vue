<template>
  <div class="flex h-screen flex-col overflow-hidden">
    <AppHeader />

    <main class="flex-1 overflow-y-auto">
      <div class="mx-auto flex h-full w-full max-w-[96rem] flex-col px-6 py-8 lg:px-10 lg:py-10">
        <section class="page-rule pb-8">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-[0.72rem] uppercase tracking-[0.28em] text-text-muted">Management</p>
              <h1 class="mt-4 text-4xl font-medium tracking-tight text-text-primary">Admin</h1>
              <p class="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
                所有管理动作都收束到一条更安静的工作流里，方便长时间整理，不让界面本身制造额外负担。
              </p>
            </div>

            <router-link
              to="/"
              class="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              返回书签首页
            </router-link>
          </div>
        </section>

        <section class="flex flex-1 flex-col pt-8">
          <div class="mb-6 flex flex-wrap gap-2 border-b border-border-subtle pb-4">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="[
                'border px-4 py-2 text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-border bg-surface-raised text-text-primary'
                  : 'border-transparent text-text-muted hover:border-border-subtle hover:text-text-primary',
              ]"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="flex-1 overflow-hidden">
            <template v-if="activeTab === 'links'">
              <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div class="flex max-w-xl flex-1 items-center gap-3 border border-border px-4 py-3">
                  <Search class="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    v-model="tableSearch"
                    class="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                    placeholder="搜索链接、标签或 URL"
                  />
                  <button
                    v-if="tableSearch"
                    class="text-text-muted transition-colors hover:text-text-primary"
                    @click="tableSearch = ''"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </div>

                <select
                  v-model="tableCategory"
                  class="border-b border-border bg-transparent pb-2 text-sm text-text-primary focus:outline-none"
                >
                  <option value="">全部分类</option>
                  <option v-for="cat in linksStore.categories" :key="cat.name" :value="cat.name">
                    {{ cat.name }}
                  </option>
                </select>

                <div class="flex-1" />

                <UiButton variant="fill" @click="openAddLink">
                  <Plus class="mr-1 h-4 w-4" />
                  新增链接
                </UiButton>
              </div>

              <div class="flex-1 overflow-y-auto border border-border-subtle">
                <LinkTable
                  :links="filteredTableLinks"
                  @edit="openEditLink"
                  @delete="deleteLink"
                  @toggle-pin="togglePin"
                />
              </div>
            </template>

            <template v-if="activeTab === 'categories'">
              <div class="flex-1 overflow-y-auto">
                <CategoryManager />
              </div>
            </template>

            <template v-if="activeTab === 'data'">
              <div class="flex-1 overflow-y-auto">
                <ImportExport />
              </div>
            </template>
          </div>

          <div class="mt-6 flex items-center gap-4 border-t border-border-subtle pt-4">
            <span class="text-[0.72rem] uppercase tracking-[0.18em] text-text-muted">Admin Mode</span>
            <button
              :class="[
                'relative h-7 w-12 border transition-colors',
                uiStore.isAdmin ? 'border-text-primary bg-text-primary' : 'border-border bg-surface',
              ]"
              @click="uiStore.setAdmin(!uiStore.isAdmin)"
            >
              <span
                :class="[
                  'absolute top-1 h-5 w-5 bg-surface transition-transform',
                  uiStore.isAdmin ? 'left-6' : 'left-1',
                ]"
              />
            </button>
          </div>
        </section>
      </div>
    </main>

    <LinkForm
      :show="showLinkForm"
      :link="editingLink"
      :categories="linksStore.categories"
      @close="showLinkForm = false"
      @save="saveLink"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Search, X } from 'lucide-vue-next'
import type { LinkItem } from '@/types'
import { useLinksStore, useUiStore } from '@/stores'
import AppHeader from '@/components/layout/AppHeader.vue'
import CategoryManager from '@/components/admin/CategoryManager.vue'
import ImportExport from '@/components/admin/ImportExport.vue'
import LinkForm from '@/components/admin/LinkForm.vue'
import LinkTable from '@/components/admin/LinkTable.vue'
import UiButton from '@/components/ui/UiButton.vue'

const linksStore = useLinksStore()
const uiStore = useUiStore()

const tabs = [
  { id: 'links', label: '书签' },
  { id: 'categories', label: '分类' },
  { id: 'data', label: '数据' },
]

const activeTab = ref('links')
const showLinkForm = ref(false)
const editingLink = ref<LinkItem | null>(null)
const tableSearch = ref('')
const tableCategory = ref('')

const filteredTableLinks = computed(() => {
  let links = linksStore.links

  if (tableCategory.value) {
    links = links.filter(link => link.category === tableCategory.value)
  }

  if (tableSearch.value.trim()) {
    const query = tableSearch.value.toLowerCase().trim()
    links = links.filter(link =>
      link.title.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query) ||
      link.desc?.toLowerCase().includes(query) ||
      link.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  return links
})

function openAddLink() {
  editingLink.value = null
  showLinkForm.value = true
}

function openEditLink(link: LinkItem) {
  editingLink.value = link
  showLinkForm.value = true
}

function saveLink(data: { title: string; url: string; desc: string; category: string; tags: string[] }) {
  if (editingLink.value) {
    linksStore.updateLink(editingLink.value.id, data)
  } else {
    linksStore.addLink(data)
  }

  showLinkForm.value = false
  editingLink.value = null
}

function deleteLink(id: string) {
  linksStore.deleteLink(id)
}

function togglePin(id: string) {
  linksStore.togglePin(id)
}
</script>
