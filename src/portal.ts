import './portal.css'
import { initializeSignalField } from './signal-field'

/* ---------- 类型 ---------- */

interface ServiceInfo {
  id: string
  label: string
  kind: 'container' | 'systemd' | 'static' | 'readonly'
  path: string | null
  state: 'up' | 'down' | 'missing' | 'readonly'
  ms: number | null
  status: number | null
  controllable: boolean
}

interface Overview {
  host: string
  platform: string
  cores: number
  model: string
  uptimeSec: number
  load: number[]
  mem: { totalBytes: number; usedBytes: number; percent: number }
  disk: { totalBytes: number; usedBytes: number; percent: number } | null
  services: ServiceInfo[]
  at: string
}

/** 服务说明从页面数据读，避免和后端白名单两处硬编码 */
const SERVICE_DESC: Record<string, string> = {
  bookmarks: '个人书签与知识入口',
  'doc-search': 'HAR 文件里按接口路径反查',
  dpp: '模型驱动的企业开发平台',
  examples: '平台能力的可运行示例',
  'event-architecture': '事件驱动架构图景',
  design: '界面设计理论九章',
  'dpp-mock': 'DPP 文档站的实时预览后端',
}

const KIND_LABEL: Record<ServiceInfo['kind'], string> = {
  container: 'container',
  systemd: 'service',
  static: 'static',
  readonly: 'protected',
}

const STATE_LABEL: Record<ServiceInfo['state'], string> = {
  up: '在线',
  down: '已停止',
  missing: '未运行',
  readonly: '受保护',
}

/* ---------- 元素 ---------- */

const el = {
  field: document.getElementById('field') as HTMLCanvasElement | null,
  clockTime: document.getElementById('clock-time') as HTMLElement,
  clockDate: document.getElementById('clock-date') as HTMLElement,
  host: document.getElementById('host-name') as HTMLElement,
  load: document.getElementById('v-load') as HTMLElement,
  mem: document.getElementById('v-mem') as HTMLElement,
  disk: document.getElementById('v-disk') as HTMLElement,
  uptime: document.getElementById('v-uptime') as HTMLElement,
  services: document.getElementById('services') as HTMLElement,
  count: document.getElementById('svc-count') as HTMLElement,
  footHost: document.getElementById('foot-host') as HTMLElement,
  footPlatform: document.getElementById('foot-platform') as HTMLElement,
  footAt: document.getElementById('foot-at') as HTMLElement,
  footPulse: document.getElementById('foot-pulse') as HTMLElement,
}

/* ---------- 工具 ---------- */

const pad = (n: number) => String(n).padStart(2, '0')

function bytes(b: number): string {
  if (b >= 1024 ** 4) return `${(b / 1024 ** 4).toFixed(1)}T`
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)}G`
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(0)}M`
  return `${b}B`
}

function duration(sec: number): string {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}天${h}时`
  if (h > 0) return `${h}时${m}分`
  return `${m}分`
}

function setVital(id: 'load' | 'mem' | 'disk', percent: number, text: string) {
  const box = document.querySelector<HTMLElement>(`.vital[data-vital="${id}"]`)
  if (box) {
    box.dataset.level = percent >= 90 ? 'crit' : percent >= 75 ? 'warn' : 'ok'
    const bar = box.querySelector<HTMLElement>('.vital__meter i')
    if (bar) bar.style.setProperty('--v', String(Math.min(100, Math.max(0, percent))))
  }
  const out = el[id]
  if (out) out.textContent = text
}

/* ---------- 时钟 ---------- */

function tickClock() {
  const now = new Date()
  el.clockTime.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  el.clockDate.textContent = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/* ---------- 服务通道 ---------- */

function renderService(s: ServiceInfo, i: number): HTMLLIElement {
  const li = document.createElement('li')
  li.className = 'svc'
  li.dataset.state = s.state

  const hit = document.createElement(s.path ? 'a' : 'div')
  hit.className = 'svc__hit'
  if (s.path) (hit as HTMLAnchorElement).href = s.path

  const idx = document.createElement('span')
  idx.className = 'svc__idx'
  idx.textContent = String(i + 1).padStart(2, '0')

  const id = document.createElement('span')
  id.className = 'svc__id'
  const lamp = document.createElement('span')
  lamp.className = 'svc__lamp'
  lamp.setAttribute('aria-hidden', 'true')
  const name = document.createElement('span')
  name.className = 'svc__name'
  name.textContent = s.label
  id.append(lamp, name)

  const desc = document.createElement('span')
  desc.className = 'svc__desc'
  desc.textContent = SERVICE_DESC[s.id] || KIND_LABEL[s.kind]

  // 读数：状态文字 + 可选延迟
  const read = document.createElement('span')
  read.className = 'svc__read'

  const stateText = document.createElement('span')
  stateText.textContent = STATE_LABEL[s.state]
  read.append(stateText)

  if (typeof s.ms === 'number') {
    const lat = document.createElement('span')
    lat.className = 'svc__lat'
    lat.dataset.slow = String(s.ms > 400)
    // 400ms 映射到满格
    lat.innerHTML = `<i style="--w:${Math.min(100, (s.ms / 400) * 100)}"></i>`
    lat.title = `${s.ms}ms`
    const ms = document.createElement('span')
    ms.textContent = `${s.ms}ms`
    read.append(lat, ms)
  }

  const path = document.createElement('span')
  path.className = 'svc__path'
  path.textContent = s.path || '—'

  const arrow = document.createElement('span')
  arrow.className = 'svc__arrow'
  arrow.setAttribute('aria-hidden', 'true')
  arrow.textContent = s.path ? '↗' : '·'

  hit.append(idx, id, desc, read, path, arrow)
  li.append(hit)
  return li
}

function renderOverview(data: Overview) {
  el.host.textContent = data.host
  el.footHost.textContent = data.host
  el.footPlatform.textContent = `${data.platform} · ${data.cores} 核`
  el.uptime.textContent = duration(data.uptimeSec)

  const load1 = data.load[0] ?? 0
  // 负载按核数归一化，否则 4 核和 16 核的读数无法比较
  setVital('load', (load1 / Math.max(1, data.cores)) * 100, `${load1.toFixed(2)} / ${data.cores}`)
  setVital('mem', data.mem.percent, `${bytes(data.mem.usedBytes)} / ${bytes(data.mem.totalBytes)}`)
  if (data.disk) {
    setVital('disk', data.disk.percent, `${data.disk.percent}% · ${bytes(data.disk.totalBytes - data.disk.usedBytes)} 可用`)
  } else {
    setVital('disk', 0, '未知')
  }

  const list = data.services.filter(s => s.path)
  el.services.replaceChildren(...list.map(renderService))
  el.count.textContent = `${list.filter(s => s.state === 'up').length} / ${list.length} 在线`

  el.footAt.textContent = new Date(data.at).toLocaleTimeString('zh-CN', { hour12: false })
  el.footPulse.textContent = '实时'
  el.footPulse.dataset.state = 'live'
}

function renderStale(reason: string) {
  el.services.replaceChildren()
  const li = document.createElement('li')
  li.className = 'svc'
  li.dataset.state = 'down'
  li.innerHTML = `<div class="svc__hit"><span class="svc__idx">!!</span><span class="svc__id"><span class="svc__lamp"></span><span class="svc__name">无法读取服务状态</span></span><span class="svc__desc">${reason}</span></div>`
  el.services.append(li)
  el.count.textContent = '离线'
  el.footPulse.textContent = '无数据'
  el.footPulse.dataset.state = 'stale'
}

/* ---------- 数据 ---------- */

let failures = 0

async function refresh() {
  try {
    const res = await fetch('/console/api/public/overview', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    renderOverview((await res.json()) as Overview)
    failures = 0
  } catch (err) {
    failures += 1
    // 首次失败就明确报错；偶发失败保留上次读数，避免闪烁
    if (failures >= 2) renderStale(String((err as Error).message))
  }
}

/* ---------- 启动 ---------- */

tickClock()
window.setInterval(tickClock, 1000)

if (el.field) {
  const stop = initializeSignalField(el.field)
  window.addEventListener('pagehide', stop, { once: true })
}

refresh()
window.setInterval(() => {
  if (!document.hidden) refresh()
}, 15_000)
