import './portal.css'
import './console.css'

/* ---------- 类型 ---------- */

interface Probe {
  reachable: boolean
  status: number | null
  error?: string
}

interface Target {
  id: string
  label: string
  kind: 'container' | 'systemd' | 'static' | 'readonly'
  note: string | null
  controllable: boolean
  state: 'up' | 'down' | 'missing' | 'readonly'
  probe: Probe | null
  runtime?: {
    exists: boolean
    status?: string
    substate?: string
    startedAt?: string
    restarts?: number
  } | null
}

interface StatusPayload {
  host: string
  targets: Target[]
  at: string
}

/* ---------- 常量 ---------- */

const API = '/console/api'
const REFRESH_MS = 30_000

const STATE_LABEL: Record<Target['state'], string> = {
  up: '运行中',
  down: '已停止',
  missing: '不存在',
  readonly: '只读',
}

const KIND_LABEL: Record<Target['kind'], string> = {
  container: 'docker 容器',
  systemd: 'systemd 单元',
  static: '静态目录',
  readonly: '受保护',
}

/* ---------- 元素 ---------- */

const el = {
  host: document.getElementById('host-name') as HTMLElement,
  at: document.getElementById('fetch-at') as HTMLElement,
  autoState: document.getElementById('auto-state') as HTMLElement,
  refresh: document.getElementById('refresh') as HTMLButtonElement,
  banner: document.getElementById('banner') as HTMLElement,
  list: document.getElementById('list') as HTMLElement,
  drawer: document.getElementById('drawer') as HTMLElement,
  drawerTitle: document.getElementById('drawer-title') as HTMLElement,
  drawerClose: document.getElementById('drawer-close') as HTMLButtonElement,
  logs: document.getElementById('logs') as HTMLElement,
}

/* ---------- 工具 ---------- */

function fmtTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function fmtUptime(startedAt: string | undefined): string {
  if (!startedAt) return ''
  const t = new Date(startedAt).getTime()
  if (Number.isNaN(t)) return ''
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `已运行 ${d} 天 ${h} 小时`
  if (h > 0) return `已运行 ${h} 小时 ${m} 分`
  return `已运行 ${m} 分`
}

function showBanner(text: string, kind: 'error' | 'ok') {
  el.banner.textContent = text
  el.banner.dataset.kind = kind
  el.banner.hidden = false
  if (kind === 'ok') {
    window.setTimeout(() => {
      el.banner.hidden = true
    }, 4000)
  }
}

function clearBanner() {
  el.banner.hidden = true
}

/* ---------- 渲染 ---------- */

function renderRow(t: Target): HTMLLIElement {
  const li = document.createElement('li')
  li.className = 'row2'
  li.dataset.state = t.state

  // 状态灯：颜色 + 文字，不单靠颜色传达
  const state = document.createElement('span')
  state.className = 'row2__state'
  state.innerHTML = `<i class="dot" aria-hidden="true"></i><span>${STATE_LABEL[t.state]}</span>`

  const name = document.createElement('span')
  name.className = 'row2__name'
  name.textContent = t.label

  const meta = document.createElement('span')
  meta.className = 'row2__meta'
  const bits: string[] = [KIND_LABEL[t.kind]]
  if (t.runtime?.restarts !== undefined && t.runtime.restarts > 0) {
    bits.push(`重启 ${t.runtime.restarts} 次`)
  }
  if (t.runtime?.startedAt) {
    const up = fmtUptime(t.runtime.startedAt)
    if (up) bits.push(up)
  }
  if (t.probe) {
    bits.push(t.probe.status ? `HTTP ${t.probe.status}` : t.probe.error ? `探测失败 ${t.probe.error}` : '无法探测')
  }
  meta.textContent = bits.join(' · ')

  const note = document.createElement('span')
  note.className = 'row2__note'
  note.textContent = t.note || ''

  const actions = document.createElement('span')
  actions.className = 'row2__actions'

  if (t.controllable) {
    const isUp = t.state === 'up'
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = `btn btn--${isUp ? 'danger' : 'go'}`
    toggle.textContent = isUp ? '停止' : '启动'
    toggle.addEventListener('click', () => act(t, isUp ? 'stop' : 'start', toggle))
    actions.append(toggle)

    if (t.kind === 'container' || t.kind === 'systemd') {
      const logs = document.createElement('button')
      logs.type = 'button'
      logs.className = 'btn btn--quiet'
      logs.textContent = '日志'
      logs.addEventListener('click', () => openLogs(t))
      actions.append(logs)
    }
  } else {
    const tag = document.createElement('span')
    tag.className = 'row2__tag'
    tag.textContent = t.kind === 'static' ? '无进程' : '只读'
    actions.append(tag)
  }

  li.append(state, name, meta, note, actions)
  return li
}

function render(data: StatusPayload) {
  el.host.textContent = data.host || '—'
  el.at.textContent = fmtTime(data.at)
  el.list.setAttribute('aria-busy', 'false')
  el.list.replaceChildren(...data.targets.map(renderRow))
}

/* ---------- 数据 ---------- */

async function loadStatus() {
  try {
    const res = await fetch(`${API}/status`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    render((await res.json()) as StatusPayload)
  } catch (err) {
    el.list.setAttribute('aria-busy', 'false')
    showBanner(`无法读取服务状态：${String((err as Error).message)}`, 'error')
  }
}

// 同一时刻只允许一个启停操作，避免重复点击发出两个请求
let busy = false

async function act(t: Target, action: 'start' | 'stop', btn: HTMLButtonElement) {
  if (busy) return

  const verb = action === 'start' ? '启动' : '停止'
  if (action === 'stop' && !window.confirm(`确定要${verb}「${t.label}」吗？`)) return

  const original = btn.textContent || verb
  busy = true
  btn.disabled = true
  btn.textContent = `${verb}中…`
  clearBanner()

  try {
    const res = await fetch(`${API}/targets/${encodeURIComponent(t.id)}/${action}`, { method: 'POST' })
    const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
    if (!res.ok) throw new Error(body.message || body.error || `HTTP ${res.status}`)
    showBanner(`${t.label}：${body.message || verb + '完成'}`, 'ok')
  } catch (err) {
    showBanner(`${t.label} ${verb}失败：${String((err as Error).message)}`, 'error')
    // 失败时立刻恢复按钮，不等状态刷新，否则用户不知道该不该重试
    btn.textContent = original
    btn.disabled = false
  } finally {
    busy = false
    // 等容器状态真正落定再刷新，stop 最长约 6 秒
    window.setTimeout(loadStatus, 1500)
  }
}

async function openLogs(t: Target) {
  el.drawer.hidden = false
  el.drawerTitle.textContent = `${t.label} · 日志`
  el.logs.textContent = '加载中…'

  try {
    const res = await fetch(`${API}/targets/${encodeURIComponent(t.id)}/logs?lines=200`)
    const body = (await res.json()) as { logs?: string; error?: string }
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
    el.logs.textContent = body.logs?.trim() || '（没有日志输出）'
  } catch (err) {
    el.logs.textContent = `读取失败：${String((err as Error).message)}`
  }
}

/* ---------- 启动 ---------- */

el.refresh.addEventListener('click', () => {
  clearBanner()
  el.list.setAttribute('aria-busy', 'true')
  loadStatus()
})

el.drawerClose.addEventListener('click', () => {
  el.drawer.hidden = true
})

document.addEventListener('visibilitychange', () => {
  el.autoState.textContent = document.hidden ? '暂停' : '开'
})

loadStatus()
window.setInterval(() => {
  if (!document.hidden) loadStatus()
}, REFRESH_MS)
