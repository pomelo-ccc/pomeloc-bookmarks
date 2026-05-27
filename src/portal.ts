import './portal.css'

type SurfaceKey = 'paper' | 'gallery' | 'slate'

const surfaceStorageKey = 'pomeloc_surface'
const body = document.body
const select = document.getElementById('surface-select') as HTMLSelectElement | null

function isSurfaceKey(value: string | null): value is SurfaceKey {
  return value === 'paper' || value === 'gallery' || value === 'slate'
}

function applySurface(surface: SurfaceKey, persist = true) {
  body.dataset.surface = surface
  body.classList.add('surface-is-switching')
  window.setTimeout(() => {
    body.classList.remove('surface-is-switching')
  }, 220)

  if (select) {
    select.value = surface
  }

  if (persist) {
    localStorage.setItem(surfaceStorageKey, surface)
  }
}

select?.addEventListener('change', event => {
  const next = (event.target as HTMLSelectElement).value
  if (isSurfaceKey(next)) {
    applySurface(next)
  }
})

const stored = localStorage.getItem(surfaceStorageKey)
applySurface(isSurfaceKey(stored) ? stored : 'paper', false)
