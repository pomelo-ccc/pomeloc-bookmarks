import './portal.css'

type SurfaceKey = 'paper' | 'gallery' | 'slate'

const surfaceStorageKey = 'pomeloc_surface'

function isSurfaceKey(value: string | null): value is SurfaceKey {
  return value === 'paper' || value === 'gallery' || value === 'slate'
}

/* ---------- 外观切换 ---------- */

const surfaceSelect = document.getElementById('surface-select') as HTMLSelectElement | null

function applySurface(surface: SurfaceKey, persist: boolean) {
  document.body.dataset.surface = surface
  document.body.classList.add('surface-is-switching')
  window.setTimeout(() => document.body.classList.remove('surface-is-switching'), 220)
  if (surfaceSelect) surfaceSelect.value = surface
  if (persist) localStorage.setItem(surfaceStorageKey, surface)
}

surfaceSelect?.addEventListener('change', event => {
  const next = (event.target as HTMLSelectElement).value
  if (isSurfaceKey(next)) applySurface(next, true)
})

const stored = localStorage.getItem(surfaceStorageKey)
applySurface(isSurfaceKey(stored) ? stored : 'paper', false)

/* ---------- 构建时间 ----------
 * 由 vite 在构建时注入。读不到就留空，不编造时间。
 */

const stampEl = document.getElementById('build-stamp')
if (stampEl) {
  const iso = stampEl.getAttribute('datetime')
  if (iso && iso !== '%BUILD_STAMP%') {
    const d = new Date(iso)
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0')
      stampEl.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    } else {
      stampEl.textContent = '未知'
    }
  } else {
    stampEl.textContent = '开发模式'
  }
}

/* ---------- 服务计数 ----------
 * 从 DOM 数实际渲染出来的条目，不写死数字。
 */

const countEl = document.getElementById('service-count')
if (countEl) {
  const total = document.querySelectorAll('.rows .row').length
  const apps = document.querySelectorAll('.index__group:not(.index__group--aside) .row').length
  countEl.textContent = total === apps ? String(total) : `${apps}+1`
}
