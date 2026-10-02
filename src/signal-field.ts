/**
 * 背景信号场。
 *
 * 一束从中心向左上扫过的雷达扫掠线，加上散布的数据点。
 * 纯 canvas 2D，不引入任何依赖。
 *
 * 性能与礼貌：
 * - devicePixelRatio 上限 2，避免 5K 屏上画四倍像素
 * - 页面隐藏时暂停（requestAnimationFrame 自然停，另加监听兜底）
 * - prefers-reduced-motion 下完全不启动
 */

/** 琥珀色，与 CSS 的 --accent 对齐。canvas 用具体色值更可靠 */
const ACCENT = 'rgb(240, 176, 92)'

interface Point {
  x: number
  y: number
  r: number
  phase: number
  speed: number
}

export function initializeSignalField(canvas: HTMLCanvasElement): () => void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return () => {}

  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  let raf = 0
  let width = 0
  let height = 0
  let dpr = 1
  let points: Point[] = []
  let sweep = 0
  let running = true

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

    // 点的密度跟着面积走，窄屏不会挤成一片
    const count = Math.min(120, Math.max(36, Math.round((width * height) / 16000)))
    points = Array.from({ length: count }, (_, i) => ({
      x: (i * 131.7) % width,
      y: ((i * 977.3) % height) * 0.92 + height * 0.04,
      r: 0.6 + ((i * 37) % 10) / 10,
      phase: (i * 1.7) % (Math.PI * 2),
      speed: 0.4 + ((i * 13) % 7) / 10,
    }))
  }

  const cx = () => width * 0.5
  const cy = () => height * 0.32

  function draw(t: number) {
    if (!running) return
    const time = t / 1000

    ctx!.globalAlpha = 1
    ctx!.clearRect(0, 0, width, height)

    const originX = cx()
    const originY = cy()

    // 环形刻度：半径随距离递增，越远越淡
    const rings = 7
    for (let i = 1; i <= rings; i++) {
      const p = i / rings
      const r = Math.min(width, height) * 0.62 * p
      ctx!.beginPath()
      ctx!.arc(originX, originY, r, 0, Math.PI * 2)
      ctx!.globalAlpha = 0.42 * (1 - p * 0.62)
      ctx!.strokeStyle = ACCENT
      ctx!.lineWidth = 0.9
      ctx!.stroke()
    }

    // 扫掠扇面
    sweep = (sweep + 0.0032) % (Math.PI * 2)
    const fanLen = 0.5
    const grad = ctx!.createRadialGradient(originX, originY, 0, originX, originY, Math.min(width, height) * 0.62)
    grad.addColorStop(0, 'rgba(240, 176, 92, 0.28)')
    grad.addColorStop(1, 'rgba(240, 176, 92, 0)')
    ctx!.beginPath()
    ctx!.moveTo(originX, originY)
    ctx!.arc(originX, originY, Math.min(width, height) * 0.62, sweep - fanLen, sweep)
    ctx!.closePath()
    ctx!.globalAlpha = 1
    ctx!.fillStyle = grad
    ctx!.fill()

    // 扫掠前沿
    ctx!.beginPath()
    ctx!.moveTo(originX, originY)
    ctx!.lineTo(
      originX + Math.cos(sweep) * Math.min(width, height) * 0.62,
      originY + Math.sin(sweep) * Math.min(width, height) * 0.62
    )
    ctx!.globalAlpha = 0.72
    ctx!.strokeStyle = ACCENT
    ctx!.lineWidth = 1
    ctx!.stroke()

    // 数据点：落在扫掠线附近时被照亮
    for (const p of points) {
      const dx = p.x - originX
      const dy = p.y - originY
      const dist = Math.hypot(dx, dy)
      if (dist > Math.min(width, height) * 0.62) continue

      const angle = Math.atan2(dy, dx)
      let delta = sweep - angle
      while (delta < 0) delta += Math.PI * 2
      while (delta > Math.PI * 2) delta -= Math.PI * 2

      // 刚被扫过 => 最亮，随后衰减
      const lit = delta < fanLen ? 1 - delta / fanLen : 0
      const idle = 0.16 + 0.1 * Math.sin(time * p.speed + p.phase)
      const alpha = idle + lit * 0.72

      ctx!.globalAlpha = Math.min(1, alpha)
      ctx!.beginPath()
      ctx!.arc(p.x, p.y, p.r + lit * 1.5, 0, Math.PI * 2)
      ctx!.fillStyle = ACCENT
      ctx!.fill()
    }

    raf = window.requestAnimationFrame(draw)
  }

  function start() {
    running = true
    raf = window.requestAnimationFrame(draw)
  }

  function stop() {
    running = false
    window.cancelAnimationFrame(raf)
  }

  resize()
  start()

  let resizeTimer = 0
  const onResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(resize, 160)
  }
  const onVisibility = () => (document.hidden ? stop() : start())

  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    stop()
    window.clearTimeout(resizeTimer)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
