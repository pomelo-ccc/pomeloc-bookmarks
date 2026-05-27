import { defineStore } from 'pinia'
import type { LinkItem, Category } from '@/types'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const useLinksStore = defineStore('links', {
  state: () => ({
    links: load<LinkItem[]>('linkhub_links', []),
    categories: load<Category[]>('linkhub_categories', []),
    pinnedIds: load<string[]>('linkhub_pinned', []),
  }),

  actions: {
    init(data: { links: LinkItem[]; categories: Category[]; pinnedIds: string[] }) {
      if (this.links.length === 0 && data.links.length > 0) {
        this.links = data.links
        this.categories = data.categories
        this.pinnedIds = data.pinnedIds
        this.persist()
      }
    },

    addLink(link: Omit<LinkItem, 'id' | 'clickCount' | 'createdAt' | 'updatedAt'>) {
      const now = Date.now()
      // Fallback for crypto.randomUUID() in non-HTTPS environments
      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'link-' + now + '-' + Math.random().toString(36).slice(2, 11)
      this.links.push({
        ...link,
        id,
        clickCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      this.persist()
    },

    updateLink(id: string, data: Partial<LinkItem>) {
      const idx = this.links.findIndex(l => l.id === id)
      if (idx !== -1) {
        this.links[idx] = { ...this.links[idx], ...data, updatedAt: Date.now() }
        this.persist()
      }
    },

    deleteLink(id: string) {
      this.links = this.links.filter(l => l.id !== id)
      this.pinnedIds = this.pinnedIds.filter(pid => pid !== id)
      this.persist()
    },

    addCategory(cat: Category) {
      this.categories.push(cat)
      this.persist()
    },

    deleteCategory(name: string) {
      this.categories = this.categories.filter(c => c.name !== name)
      this.links = this.links.filter(l => l.category !== name)
      this.persist()
    },

    reorderCategories(order: string[]) {
      const map = new Map(this.categories.map(c => [c.name, c]))
      this.categories = order
        .map((name, i) => {
          const cat = map.get(name)
          return cat ? { ...cat, order: i } : null
        })
        .filter(Boolean) as Category[]
      this.persist()
    },

    togglePin(id: string) {
      const idx = this.pinnedIds.indexOf(id)
      if (idx === -1) {
        if (this.pinnedIds.length < 5) {
          this.pinnedIds.push(id)
        }
      } else {
        this.pinnedIds.splice(idx, 1)
      }
      this.persist()
    },

    incrementClick(id: string) {
      const link = this.links.find(l => l.id === id)
      if (link) {
        link.clickCount++
        link.updatedAt = Date.now()
        this.persist()
      }
    },

    importData(data: { links: LinkItem[]; categories: Category[] }) {
      this.links = data.links
      this.categories = data.categories
      this.persist()
    },

    exportData() {
      return {
        links: this.links,
        categories: this.categories,
        pinnedIds: this.pinnedIds,
      }
    },

    clearAll() {
      this.links = []
      this.categories = []
      this.pinnedIds = []
      this.persist()
    },

    persist() {
      save('linkhub_links', this.links)
      save('linkhub_categories', this.categories)
      save('linkhub_pinned', this.pinnedIds)
    },
  },
})

export const useUiStore = defineStore('ui', {
  state: () => ({
    searchOpen: false,
    searchQuery: '',
    activeCategory: null as string | null,
    sidebarCollapsed: false,
    isAdmin: localStorage.getItem('linkhub_is_admin') === 'true',
    theme: (localStorage.getItem('linkhub_theme') || 'light') as 'light' | 'dark',
    colorTheme: (localStorage.getItem('linkhub_color_theme') || 'amber') as 'lavender' | 'orange' | 'amber' | 'rose',
  }),

  actions: {
    toggleSearch() {
      this.searchOpen = !this.searchOpen
      if (this.searchOpen) this.searchQuery = ''
    },

    closeSearch() {
      this.searchOpen = false
      this.searchQuery = ''
    },

    setActiveCategory(name: string | null) {
      this.activeCategory = name
    },

    setAdmin(val: boolean) {
      this.isAdmin = val
      localStorage.setItem('linkhub_is_admin', String(val))
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('linkhub_theme', this.theme)
      this.applyTheme()
    },

    setColorTheme(color: 'lavender' | 'orange' | 'amber' | 'rose') {
      this.colorTheme = color
      localStorage.setItem('linkhub_color_theme', color)
      this.applyColorTheme()
    },

    applyTheme() {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },

    applyColorTheme() {
      const root = document.documentElement
      root.classList.remove('theme-lavender', 'theme-orange', 'theme-amber', 'theme-rose')
      root.classList.add(`theme-${this.colorTheme}`)
    },

    initTheme() {
      this.applyTheme()
      this.applyColorTheme()
    },
  },
})
