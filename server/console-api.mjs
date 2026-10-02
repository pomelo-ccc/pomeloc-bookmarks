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
import { timingSafeEqual, scrypt as scryptCb, randomBytes, createHmac, createHash } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)

const PORT = Number(process.env.PORT || 8787)
const TOKEN = process.env.TOKEN || ''
const HOST = '127.0.0.1'
// 登录口令。格式 USER:PASSWORD_HASH，哈希为 scrypt(pw, salt) 的 hex
const AUTH_USER = process.env.CONSOLE_USER || 'pomelo'
const AUTH_SALT = process.env.CONSOLE_SALT || ''
const AUTH_HASH = process.env.CONSOLE_HASH || ''
// 会话签名密钥；缺省时退回 TOKEN，避免明文空密钥
const SESSION_SECRET = process.env.CONSOLE_SESSION_SECRET || TOKEN
const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const COOKIE_NAME = 'pomeloc_console'

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

/* ---------- 会话 ---------- */

/** 常量时间比较两个 hex 摘要 */
function digestEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

async function verifyPassword(password) {
  if (!AUTH_SALT || !AUTH_HASH) return false
  const derived = await scrypt(password, AUTH_SALT, 64)
  return digestEqual(derived.toString('hex'), AUTH_HASH)
}

function sign(payload) {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
}

function issueSession(user) {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `${user}|${expires}`
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
}

/**
 * 校验并解析会话 cookie。
 *
 * 关键：cookie 的格式是 base64(payload).signature，而签名是对**原始 payload**
 * 计算的，不是对 base64 串。所以必须先解码再验签。
 * （之前这里直接拿 base64 串去验，导致自己签发的 cookie 永远验不过。）
 */
function readSession(cookieHeader) {
  if (!cookieHeader) return null

  const cookies = parseCookies(cookieHeader)
  const value = cookies[COOKIE_NAME]
  if (!value) return null

  const dot = value.lastIndexOf('.')
  if (dot < 1) return null

  const encoded = value.slice(0, dot)
  const mac = value.slice(dot + 1)

  let payload
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }

  // 先验签，再解析内容 —— 顺序不能反，否则未验证的数据会先被使用
  if (!digestEqual(sign(payload), mac)) return null

  const [user, expires] = payload.split('|')
  if (!user || !expires) return null
  if (Number(expires) < Date.now()) return null
  return { user }
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

async function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', c => {
      size += c.length
      if (size > limit) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/* ---------- 登录页 ---------- */

const LOGIN_PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>登录 · Pomeloc 控制台</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: oklch(0.145 0.006 280); color: oklch(0.95 0.005 280);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    padding: 1.5rem;
  }
  .card {
    width: 100%; max-width: 22rem; padding: 2rem;
    border: 1px solid oklch(0.32 0.01 280); border-radius: 4px;
    background: oklch(0.185 0.007 280);
  }
  .tag {
    display: block; font-size: 0.62rem; letter-spacing: 0.28em;
    text-transform: uppercase; color: oklch(0.78 0.15 68); margin-bottom: 0.5rem;
  }
  h1 { margin: 0 0 1.5rem; font-size: 1.4rem; font-weight: 600; letter-spacing: -0.02em; }
  label { display: block; font-size: 0.68rem; letter-spacing: 0.16em;
          text-transform: uppercase; color: oklch(0.58 0.01 280); margin-bottom: 0.4rem; }
  input {
    width: 100%; padding: 0.7rem 0.85rem; margin-bottom: 1.1rem;
    border: 1px solid oklch(0.32 0.01 280); border-radius: 3px;
    background: oklch(0.24 0.009 280); color: inherit; font: inherit;
  }
  input:focus-visible { outline: 2px solid oklch(0.75 0.14 245); outline-offset: 2px; }
  button {
    width: 100%; padding: 0.75rem; border: 1px solid oklch(0.6 0.11 66);
    border-radius: 3px; background: oklch(0.78 0.15 68 / 0.12);
    color: oklch(0.82 0.14 68); font: inherit; font-weight: 550; cursor: pointer;
  }
  button:hover:not(:disabled) { background: oklch(0.78 0.15 68 / 0.2); }
  button:disabled { opacity: 0.6; cursor: default; }
  .err {
    margin: 0 0 1rem; padding: 0.6rem 0.75rem; border-radius: 3px;
    border: 1px solid oklch(0.68 0.2 25 / 0.5); background: oklch(0.68 0.2 25 / 0.12);
    color: oklch(0.8 0.14 27); font-size: 0.85rem;
  }
  .back { display: block; margin-top: 1.25rem; font-size: 0.8rem;
          color: oklch(0.58 0.01 280); text-decoration: none; text-align: center; }
  .back:hover { color: oklch(0.74 0.008 280); }
</style>
</head>
<body>
  <form class="card" method="POST" action="/console/api/login">
    <span class="tag">Pomeloc</span>
    <h1>控制台</h1>
    __ERROR__
    <label for="u">用户名</label>
    <input id="u" name="user" autocomplete="username" required autofocus>
    <label for="p">口令</label>
    <input id="p" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">进入</button>
    <a class="back" href="/">← 返回首页</a>
  </form>
</body>
</html>`

function loginPage(error) {
  const block = error ? `<p class="err">${error}</p>` : ''
  return LOGIN_PAGE.replace('__ERROR__', block)
}

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

  // 第一道：这些端点自行判定身份，不走 nginx 注入的共享密钥
  const skipsToken =
    (req.method === 'GET' &&
      (url.pathname === '/public/overview' || url.pathname === '/session' || url.pathname === '/login')) ||
    (req.method === 'POST' && (url.pathname === '/login' || url.pathname === '/logout'))

  if (!skipsToken) {
    // 第二道：共享密钥。由 nginx 注入，确保请求确实经过 nginx。
    if (!TOKEN || !safeEqual(req.headers['x-console-token'] || '', TOKEN)) {
      send(res, 403, { error: 'forbidden' })
      return
    }
  }

  // 第三道：会话。凡是能读状态、看日志、启停服务的，都要已登录。
  // （nginx 不再做 Basic Auth，所以这里必须自己守住，否则 /status 会裸奔。）
  const needsSession = !skipsToken && url.pathname !== '/public/overview'
  if (needsSession) {
    const session = readSession(req.headers.cookie)
    if (!session) {
      send(res, 401, { error: 'unauthenticated' })
      return
    }
  }

  try {
    // 公开只读概览：首页用，不需要 token
    if (req.method === 'GET' && url.pathname === '/public/overview') {
      send(res, 200, await publicOverview())
      return
    }

    /* ---------- 登录 / 登出 ---------- */

    if (req.method === 'POST' && url.pathname === '/login') {
      const raw = await readBody(req)
      const form = new URLSearchParams(raw)
      const user = form.get('user') || ''
      const password = form.get('password') || ''

      const userOK = user === AUTH_USER
      const passOK = await verifyPassword(password)

      if (!userOK || !passOK) {
        // 不区分「用户不存在」和「口令错误」，避免枚举用户名
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(loginPage('用户名或口令不对'))
        return
      }

      const cookie = [
        `${COOKIE_NAME}=${issueSession(user)}`,
        'HttpOnly',
        'Path=/console',
        'SameSite=Strict',
        `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
      ].join('; ')

      res.writeHead(303, { Location: '/console/', 'Set-Cookie': cookie, 'Cache-Control': 'no-store' })
      res.end()
      return
    }

    if (req.method === 'POST' && url.pathname === '/logout') {
      res.writeHead(303, {
        Location: '/console/',
        'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; Path=/console; SameSite=Strict; Max-Age=0`,
        'Cache-Control': 'no-store',
      })
      res.end()
      return
    }

    // 会话状态：前端用它决定显示登录还是控制台
    // 直接访问登录页
    if (req.method === 'GET' && url.pathname === '/login') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(loginPage(null))
      return
    }

    if (req.method === 'GET' && url.pathname === '/session') {
      const session = readSession(req.headers.cookie)
      send(res, 200, { authenticated: Boolean(session), user: session?.user || null })
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
