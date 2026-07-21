import './portal.css'
import { initializeBookAnimation } from './portal-book'

type SurfaceKey = 'paper' | 'gallery' | 'slate'

const surfaceStorageKey = 'pomeloc_surface'
const portalBody = document.body
const surfaceSelect = document.getElementById('surface-select') as HTMLSelectElement | null
const bookCanvas = document.getElementById('portal-book-canvas') as HTMLCanvasElement | null

function isSurfaceKey(value: string | null): value is SurfaceKey {
  return value === 'paper' || value === 'gallery' || value === 'slate'
}

function updateSurface(surface: SurfaceKey) {
  portalBody.dataset.surface = surface
  portalBody.classList.add('surface-is-switching')
  window.setTimeout(() => portalBody.classList.remove('surface-is-switching'), 220)

  if (surfaceSelect) {
    surfaceSelect.value = surface
  }
}

function selectSurface(surface: SurfaceKey) {
  updateSurface(surface)
  localStorage.setItem(surfaceStorageKey, surface)
}

surfaceSelect?.addEventListener('change', event => {
  const nextSurface = (event.target as HTMLSelectElement).value
  if (isSurfaceKey(nextSurface)) {
    selectSurface(nextSurface)
  }
})

const storedSurface = localStorage.getItem(surfaceStorageKey)
updateSurface(isSurfaceKey(storedSurface) ? storedSurface : 'paper')

if (bookCanvas) {
  try {
    const stopBookAnimation = initializeBookAnimation({ canvas: bookCanvas })
    window.addEventListener('pagehide', stopBookAnimation, { once: true })
  } catch (error) {
    console.error('Unable to render the interactive book', error)
    bookCanvas.closest('.portal-book')?.classList.add('portal-book--fallback')
  }
}
