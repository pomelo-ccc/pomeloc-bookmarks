import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '@/stores'

export function useKeyboard() {
  const uiStore = useUiStore()

  function handler(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      uiStore.toggleSearch()
    }
    if (e.key === 'Escape') {
      uiStore.closeSearch()
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
