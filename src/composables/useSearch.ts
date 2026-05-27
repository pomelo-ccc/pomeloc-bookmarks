import { computed, type Ref } from 'vue'
import { pinyin } from 'pinyin-pro'
import type { LinkItem } from '@/types'

export function useSearch(links: Ref<LinkItem[]>, query: Ref<string>) {
  const results = computed(() => {
    const q = query.value.toLowerCase().trim()
    if (!q) return links.value

    return links.value.filter(link => {
      if (link.title.toLowerCase().includes(q)) return true
      if (link.url.toLowerCase().includes(q)) return true
      if (link.tags.some(t => t.toLowerCase().includes(q))) return true
      if (link.category.toLowerCase().includes(q)) return true
      if (link.desc?.toLowerCase().includes(q)) return true
      if (matchPinyin(link.title, q)) return true
      if (matchPinyin(link.category, q)) return true
      return false
    })
  })

  return { results }
}

function matchPinyin(text: string, search: string): boolean {
  try {
    const py = pinyin(text, { toneType: 'none', type: 'array' })
    if (!py) return false
    const pyString = py.join('').toLowerCase()
    const pyFirst = py.map(p => p[0]).join('').toLowerCase()
    return pyString.includes(search) || pyFirst.includes(search)
  } catch {
    return false
  }
}
