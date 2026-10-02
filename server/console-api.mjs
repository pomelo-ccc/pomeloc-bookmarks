#!/usr/bin/env node
/**
 * Pomeloc 控制台后端
 *
 * 设计原则：
 * 1. 只绑定 127.0.0.1，不对外暴露。外部访问一律经 nginx 反代 + Basic Auth。
 * 2. 所有可操作对象写死在 TARGETS 白名单里。请求只能按 id 命中白名单，
 *    永远不接受客户端传来的容器名、服务名或命令行参数。
 * 3. 只用 execFile 传参数数组，不拼 shell 字符串。
 * 4. 危险目标（Dokploy 自身、数据库）标记为只读，拒绝启停。
 *
 * 环境变量：
 *   PORT      监听端口，默认 8787
 *   TOKEN     共享密钥。nginx 反代时会注入 X-Console-Token 头，不匹配则 403。
 */

import { createServer, request } from 'node:http'
import { statfs } from 'node:fs/promises'
import { cpus, loadavg, totalmem, freemem, uptime, hostname, platform, release } from 'node:os'
import { execFile } from 'node:child_process'
import { timingSafeEqual } from 'node:crypto'

const PORT = Number(process.env.PORT || 8787)
const TOKEN = process.env.TOKEN || ''
const HOST = '127.0.0.1'
const MAX_LOG_LINES = 400
const CMD_TIMEOUT = 30_000

/**
 * 白名单。kind 决定用什么命令操作：
 *   container  普通 docker 容器      docker start/stop  <container>
 *   service    swarm 服务            docker service scale <name>=0|1
 *   systemd    systemd 单元          systemctl start/stop <unit>
 *   static     纯静态目录（无进程）  不可启停
 *   readonly   危险目标              不可启停
 */
const TARGETS = [
  {
    id: 'doc-search',
    label: 'HAR 路径检索',
    kind: 'container',
    container: 'doc-search',
    path: '/doc-search/',
    probe: 'http://172.17.0.1:4173/',
  },
  {
    id: 'event-architecture',
    label: '事件架构',
    kind: 'container',
    container: 'event-architecture',
    path: '/event-architecture/',
    probe: 'http://127.0.0.1:3001/event-architecture',
    // 未登录返回 401，这代表它活着
    okStatuses: [200, 401],
  },
  {
    id: 'event-architecture-db',
    label: '事件架构数据库',
    kind: 'container',
    container: 'event-architecture-db',
    internal: true,
    note: '停掉它会让事件架构失去数据',
  },
  {
    id: 'dpp-mock',
    label: 'DPP Mock 服务',
    kind: 'systemd',
    unit: 'dpp-mock.service',
    internal: true,
    // 该服务没有健康检查端点，探活只看 systemd 状态，不做 HTTP 探测
    probe: null
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    kind: 'static',
    path: '/bookmarks/',
    note: '纯静态文件，由 nginx 直接读取，没有独立进程',
  },
  {
    id: 'dpp',
    label: 'DPP 开发平台',
    kind: 'static',
    path: '/dpp/',
    note: '纯静态文件，由 nginx 直接读取，没有独立进程',
  },
  {
    id: 'examples',
    label: 'DPP Examples',
    kind: 'static',
    path: '/examples/',
    note: '纯静态文件，由 nginx 直接读取，没有独立进程',
  },
  {
    id: 'design',
    label: 'UI 设计理论',
    kind: 'static',
    path: '/design/',
    note: '纯静态文件，由 nginx 直接读取，没有独立进程',
  },
  {
    id: 'pomeloc-web',
    label: 'Pomeloc Web (swarm)',
    kind: 'readonly',
    internal: true,
    note: '当前站点的容器，停止它等于关站，只能看状态',
  },
  {
    id: 'dokploy',
    label: 'Dokploy',
    kind: 'readonly',
    internal: true,
    note: '部署平台自身，不从这里操作',
  },
]

const BY_ID = new Map(TARGETS.map(t => [t.id, t]))

/* ---------- 工具 ---------- */

function run(cmd, args) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout: CMD_TIMEOUT, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        code: err?.code ?? 0,
        stdout: String(stdout || ''),
        stderr: String(stderr || err?.message || ''),
      })
    })
  })
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * 探活。
 *
 * 用 node:http 而不是 fetch：fetch（undici）会忽略 Host 头，
 * 而本站的 nginx 按 server_name 分流，不带 Host 会落到 default server 拿到 404。
 */
function probe(rawUrl, okStatuses = [200], host = 'pomeloc.top') {
  if (!rawUrl) return Promise.resolve(null)

  return new Promise(resolve => {
    let url
    try {
      url = new URL(rawUrl)
    } catch {
      resolve({ reachable: false, status: null, error: 'bad url' })
      return
    }

    const started = performance.now()
    const req = request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { Host: host },
        timeout: 6000,
      },
      res => {
        res.resume() // 丢弃响应体，只关心状态码
        resolve({
          reachable: okStatuses.includes(res.statusCode),
          status: res.statusCode,
          ms: Math.round(performance.now() - started),
        })
      }
    )

    req.on('timeout', () => {
      req.destroy()
      resolve({ reachable: false, status: null, error: 'TIMEOUT' })
    })
    req.on('error', err => {
      resolve({ reachable: false, status: null, error: String(err.code || err.name || err) })
    })
    req.end()
  })
}

/* ---------- 系统遥测 ---------- */

async function systemMetrics() {
  const cores = cpus()
  const total = totalmem()
  const free = freemem()

  let disk = null
  try {
    const s = await statfs('/')
    const totalBytes = s.blocks * s.bsize
    const freeBytes = s.bavail * s.bsize
    disk = {
      totalBytes,
      usedBytes: totalBytes - freeBytes,
      percent: Math.round(((totalBytes - freeBytes) / totalBytes) * 100),
    }
  } catch {
    disk = null
  }

  return {
    host: hostname(),
    platform: `${platform()} ${release()}`,
    cores: cores.length,
    model: (cores[0]?.model || '').trim(),
    uptimeSec: Math.round(uptime()),
    load: loadavg().map(n => Math.round(n * 100) / 100),
    mem: {
      totalBytes: total,
      usedBytes: total - free,
      percent: Math.round(((total - free) / total) * 100),
    },
    disk,
  }
}

/**
 * 首页用的只读概览。
 *
 * 这一份不经过鉴权（首页是公开的），所以只暴露：
 * 主机身份、负载/内存/磁盘的聚合数字、每个服务的 up/down 与响应耗时。
 * 不含容器名、systemd 单元名、日志路径等可用于进一步探测的信息。
 */
async function publicOverview() {
  const metrics = await systemMetrics()

  const services = await Promise.all(
    TARGETS.filter(t => !t.internal).map(async t => {
      const status = await buildStatus(t)
      return {
        id: t.id,
        label: t.label,
        kind: t.kind,
        path: t.path || null,
        state: status.state,
        ms: status.probe?.ms ?? null,
        status: status.probe?.status ?? null,
        controllable: t.kind === 'container' || t.kind === 'systemd',
      }
    })
  )

  return { ...metrics, services, at: new Date().toISOString(), readOnly: true }
}

/* ---------- 状态采集 ---------- */

async function dockerState(kind, key) {
  if (kind === 'container') {
    const r = await run('docker', ['inspect', '--format', '{{.State.Status}}|{{.State.StartedAt}}|{{.RestartCount}}', key])
    if (!r.ok) return { exists: false }
    const [status, startedAt, restarts] = r.stdout.trim().split('|')
    return { exists: true, status, startedAt, restarts: Number(restarts) }
  }
  if (kind === 'service-removed') return { exists: false }
  return null
}

async function systemdState(unit) {
  const r = await run('systemctl', ['show', unit, '--property=ActiveState,SubState,ActiveEnterTimestamp'])
  if (!r.ok) return { exists: false }
  const out = Object.fromEntries(
    r.stdout
      .trim()
      .split('\n')
      .map(line => {
        const i = line.indexOf('=')
        return i === -1 ? ['', ''] : [line.slice(0, i), line.slice(i + 1)]
      })
  )
  return {
    exists: true,
    status: out.ActiveState || 'unknown',
    substate: out.SubState || '',
    startedAt: out.ActiveEnterTimestamp || '',
  }
}

async function buildStatus(target) {
  const base = {
    id: target.id,
    label: target.label,
    kind: target.kind,
    note: target.note || null,
    probeNote: target.probeNote || null,
    controllable: target.kind === 'container' || target.kind === 'service' || target.kind === 'systemd',
  }

  if (target.kind === 'container') {
    const st = await dockerState('container', target.container)
    base.runtime = st
    const p = await probe(target.probe, target.okStatuses || [200])
    base.probe = p
    base.state = !st.exists ? 'missing' : st.status === 'running' ? 'up' : 'down'
    return base
  }

  if (target.kind === 'systemd') {
    const st = await systemdState(target.unit)
    base.runtime = st
    const p = await probe(target.probe, target.okStatuses || [200])
    base.probe = p
    base.state = !st.exists ? 'missing' : st.status === 'active' ? 'up' : 'down'
    return base
  }

  if (target.kind === 'static') {
    const p = await probe(`http://127.0.0.1${target.path}`, [200])
    base.probe = p
    base.state = p?.reachable ? 'up' : 'down'
    return base
  }

  // readonly
  base.state = 'readonly'
  const p = await probe(
    target.id === 'dokploy' ? 'http://127.0.0.1:3000/' : 'http://127.0.0.1/',
    [200],
    target.id === 'dokploy' ? '127.0.0.1' : 'pomeloc.top'
  )
  base.probe = p
  return base
}

/* ---------- 动作 ---------- */

async function performAction(target, action) {
  if (target.kind === 'static') {
    return { ok: false, message: '这是纯静态目录，没有独立进程可以启停' }
  }
  if (target.kind === 'readonly') {
    return { ok: false, message: '该目标被标记为只读，不提供启停' }
  }

  if (target.kind === 'container') {
    // stop 加 -t 5：默认优雅退出等 10 秒，会让 HTTP 请求超时（实测 499）。
    // 5 秒足够让进程收尾，之后 SIGKILL。start 不需要额外参数。
    const args = action === 'start'
      ? ['start', target.container]
      : ['stop', '-t', '5', target.container]
    const r = await run('docker', args)
    if (!r.ok) return { ok: false, message: r.stderr.trim() || '命令执行失败' }
    return { ok: true, message: action === 'start' ? '已启动' : '已停止' }
  }

  if (target.kind === 'systemd') {
    const r = await run('systemctl', [action === 'start' ? 'start' : 'stop', target.unit])
    if (!r.ok) return { ok: false, message: r.stderr.trim() || '命令执行失败' }
    return { ok: true, message: action === 'start' ? '已启动' : '已停止' }
  }

  return { ok: false, message: '不支持的操作' }
}

async function fetchLogs(target, lines) {
  const n = Math.min(Math.max(Number(lines) || 100, 1), MAX_LOG_LINES)

  if (target.kind === 'container') {
    const r = await run('docker', ['logs', '--tail', String(n), '--timestamps', target.container])
    // docker logs 把输出写在 stderr 是常态
    return (r.stdout + r.stderr).trim()
  }

  if (target.kind === 'systemd') {
    const r = await run('journalctl', ['-u', target.unit, '-n', String(n), '--no-pager', '-o', 'short-iso'])
    return (r.stdout || r.stderr).trim()
  }

  return '该目标没有日志可读'
}

/* ---------- HTTP ---------- */

function send(res, code, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)

  // 公开只读概览不需要密钥，其余全部需要
  const isPublic = req.method === 'GET' && url.pathname === '/public/overview'
  if (!isPublic) {
    if (!TOKEN || !safeEqual(req.headers['x-console-token'] || '', TOKEN)) {
      send(res, 403, { error: 'forbidden' })
      return
    }
  }

  try {
    // 公开只读概览：首页用，不需要 token
    if (req.method === 'GET' && url.pathname === '/public/overview') {
      send(res, 200, await publicOverview())
      return
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      const all = await Promise.all(TARGETS.map(buildStatus))
      send(res, 200, { host: 'VM-0-4-opencloudos', targets: all, at: new Date().toISOString() })
      return
    }

    if (parts[0] === 'targets' && parts[1]) {
      const target = BY_ID.get(parts[1])
      if (!target) {
        send(res, 404, { error: 'unknown target' })
        return
      }

      if (req.method === 'GET' && parts[2] === 'logs') {
        const text = await fetchLogs(target, url.searchParams.get('lines'))
        send(res, 200, { id: target.id, logs: text })
        return
      }

      if (req.method === 'POST' && (parts[2] === 'start' || parts[2] === 'stop')) {
        const result = await performAction(target, parts[2])
        send(res, result.ok ? 200 : 409, result)
        return
      }
    }

    send(res, 404, { error: 'not found' })
  } catch (err) {
    send(res, 500, { error: String(err?.message || err) })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`console-api listening on http://${HOST}:${PORT}`)
})
