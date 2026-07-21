import {
  AmbientLight,
  BackSide,
  BufferAttribute,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Texture,
  TorusGeometry,
  Vector2,
  WebGLRenderer,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const BOOK_COVER_COLOR = 0x3a2d24
const BOOK_COVER_EDGE_COLOR = 0x4c3829
const BOOK_HINGE_COLOR = 0x241d18
const BOOK_HEADBAND_COLOR = 0xb18a56
const BOOK_PAGE_EDGE_COLOR = 0xd0c8b7
const KEY_LIGHT_COLOR = 0xfff6dd
const FILL_LIGHT_COLOR = 0xb4c1d0
const PAGE_WIDTH = 1.52
const PAGE_HEIGHT = 2.08
const PAGE_BLOCK_WIDTH = 1.57
const PAGE_BLOCK_HEIGHT = 2.12
const PAGE_BLOCK_DEPTH = 0.18
const PAGE_BLOCK_CENTER_X = 0.815
const PAGE_SEGMENTS = 28
const PAGE_BEND = 0.17
const BASE_PAGE_BOW = 0.022
const PAGE_LAYER_COUNT = 8
const PAGE_HOLD_DURATION_MS = 3_600
const ANNOTATION_DURATION_MS = 3_200
const PAGE_TURN_DURATION_MS = 2_600
const PAGE_CYCLE_DURATION_MS =
  PAGE_HOLD_DURATION_MS + ANNOTATION_DURATION_MS + PAGE_TURN_DURATION_MS
const MAX_PIXEL_RATIO = 2
const CAMERA_BASE_DISTANCE = 4.25
const CAMERA_FIT_FACTOR = 5.5
const ANNOTATION_STEPS = 72

const pageColors = {
  paper: '#eee7d6',
  paperLight: '#f6f0e2',
  paperShade: '#d9cfbb',
  ink: '#26231e',
  muted: '#696259',
  rule: '#b9af9d',
  pencil: '#315d83',
  pencilSoft: '#6f88a0',
} as const

const coverColors = {
  clothDark: '#2b211b',
  clothLight: '#604a39',
  clothMid: '#423228',
  deboss: 'rgba(20, 14, 11, 0.42)',
  fiberDark: 'rgba(24, 17, 13, 0.1)',
  fiberLight: 'rgba(224, 195, 153, 0.075)',
} as const

type BookRoute = {
  descriptionLines: readonly string[]
  detailLines: readonly string[]
  href: string
  noteLines: readonly string[]
  path: string
  pattern: string
  patternLines: readonly string[]
  title: string
  titleLines: readonly string[]
}

type BookPage = {
  kind: 'closing' | 'route' | 'title'
  route?: BookRoute
}

type PageSurface = {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  texture: CanvasTexture
}

type UnderlineSegment = {
  endX: number
  startAt: number
  startX: number
  y: number
}

type TurnDirection = 'next' | 'previous'
type CyclePhase = 'drawing' | 'holding' | 'turning'

type AnimatedPage = {
  backMaterial: MeshStandardMaterial
  frontMaterial: MeshStandardMaterial
  frontMesh: Mesh
  geometry: PlaneGeometry
  group: Group
  initialPositions: Float32Array
  turnAngle: number
}

type BookAssembly = {
  backwardPage: AnimatedPage
  book: Group
  forwardPage: AnimatedPage
  leftPage: Mesh
  leftPageMaterial: MeshStandardMaterial
  rightPage: Mesh
  rightPageMaterial: MeshStandardMaterial
}

type BookCoverMaterials = {
  boardEdge: MeshStandardMaterial
  cloth: MeshStandardMaterial
  endpaper: MeshStandardMaterial
  headband: MeshStandardMaterial
  hinge: MeshStandardMaterial
}

type BookElements = {
  canvas: HTMLCanvasElement
}

type CycleTimeline = {
  annotationProgress: number
  phase: CyclePhase
  turnProgress: number
}

type BookView = {
  activeRouteIndex: number
  animatedSurface: PageSurface
  assembly: BookAssembly
  camera: PerspectiveCamera
  caption: HTMLElement | null
  cycleStartedAt: number
  direction: TurnDirection
  elements: BookElements
  isAutoPaused: boolean
  isManualCycle: boolean
  isTurnCompletionPending: boolean
  lastAnnotationStep: number
  lastDrawnPageIndex: number
  lastFrameAt: number
  leftPageIndex: number
  backPageTextures: CanvasTexture[]
  pageTextures: CanvasTexture[]
  raycaster: Raycaster
  reducedMotion: MediaQueryList
  renderer: WebGLRenderer
  scene: Scene
}

const bookRoutes: readonly BookRoute[] = [
  {
    title: 'Interface Docs',
    titleLines: ['Interface', 'Docs'],
    descriptionLines: ['搜索、检查并导出 OpenAPI', '请求结构与参数'],
    detailLines: ['按方法与路径快速检索', '检查请求体质量与字段命名', '导出结果交给同事继续完善'],
    pattern: 'FACADE · ADAPTER',
    patternLines: ['用统一入口收拢十组接口，', '让复杂度留在系统内部。'],
    noteLines: ['先看清结构，', '再决定怎样调用。'],
    href: '/doc-search/',
    path: '/doc-search/',
  },
  {
    title: 'Event Architecture',
    titleLines: ['Event', 'Architecture'],
    descriptionLines: ['共享需求、事件与 API', '映射编辑器 · 需登录'],
    detailLines: ['整理事件与上下游关系', '维护需求到 API 的映射', '让团队共享同一张架构图'],
    pattern: 'OBSERVER · MEDIATOR',
    patternLines: ['观察变化，协调依赖，', '把事件变成可维护的连接。'],
    noteLines: ['事件不是日志，', '它描述系统为何变化。'],
    href: '/event-architecture/',
    path: '/event-architecture/',
  },
  {
    title: 'Bookmarks',
    titleLines: ['Bookmarks'],
    descriptionLines: ['个人书签、分类', '与知识入口'],
    detailLines: ['收藏常用工具与资料', '按工作主题建立分类', '保留每次查找的知识路径'],
    pattern: 'COMPOSITE · MEMENTO',
    patternLines: ['组合零散入口，保存访问轨迹，', '让知识重新出现时仍有上下文。'],
    noteLines: ['收藏不是终点，', '可以再次找到才有价值。'],
    href: '/bookmarks/',
    path: '/bookmarks/',
  },
  {
    title: 'API Gateway',
    titleLines: ['API', 'Gateway'],
    descriptionLines: ['私有 AI 网关', '与运营入口'],
    detailLines: ['集中管理私有模型调用', '统一鉴权、转发与审计', '为内部工具提供稳定边界'],
    pattern: 'PROXY · CHAIN',
    patternLines: ['代理外部能力，串联处理步骤，', '让每次调用都经过明确边界。'],
    noteLines: ['边界清楚，', '调用才会保持简单。'],
    href: '/api/',
    path: '/api/',
  },
]

const bookPages: readonly BookPage[] = [
  { kind: 'title' },
  ...bookRoutes.map(route => ({ kind: 'route' as const, route })),
  { kind: 'closing' },
]

let paperBaseCanvas: HTMLCanvasElement | null = null

function createSeededRandom() {
  let seed = 2_604_071
  return () => {
    seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return seed / 4_294_967_296
  }
}

function getPaperBaseCanvas() {
  if (paperBaseCanvas) {
    return paperBaseCanvas
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1_024
  canvas.height = 1_400
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, pageColors.paperLight)
  gradient.addColorStop(0.62, pageColors.paper)
  gradient.addColorStop(1, pageColors.paperShade)
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const random = createSeededRandom()
  context.fillStyle = 'rgba(72, 59, 43, 0.055)'
  for (let dotIndex = 0; dotIndex < 2_400; dotIndex += 1) {
    const size = random() * 1.4 + 0.2
    context.fillRect(random() * canvas.width, random() * canvas.height, size, size)
  }

  paperBaseCanvas = canvas
  return canvas
}

function createPageSurface(): PageSurface {
  const canvas = document.createElement('canvas')
  canvas.width = 1_024
  canvas.height = 1_400
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return { canvas, context, texture }
}

function preparePage(context: CanvasRenderingContext2D) {
  const canvas = context.canvas
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(getPaperBaseCanvas(), 0, 0)
  context.strokeStyle = pageColors.ink
  context.lineWidth = 3
  context.strokeRect(68, 66, canvas.width - 136, canvas.height - 132)

  const spineShade = context.createLinearGradient(0, 0, 160, 0)
  spineShade.addColorStop(0, 'rgba(45, 38, 29, 0.16)')
  spineShade.addColorStop(1, 'rgba(45, 38, 29, 0)')
  context.fillStyle = spineShade
  context.fillRect(68, 66, 110, canvas.height - 132)
}

function drawProgressLine(
  context: CanvasRenderingContext2D,
  segment: UnderlineSegment,
  progress: number,
) {
  const segmentProgress = Math.min(1, Math.max(0, (progress - segment.startAt) * 4))
  if (segmentProgress <= 0) {
    return
  }

  const visibleEnd = segment.startX + (segment.endX - segment.startX) * segmentProgress
  context.save()
  context.beginPath()
  context.strokeStyle = pageColors.pencil
  context.lineWidth = 7
  context.lineCap = 'round'
  for (let x = segment.startX; x <= visibleEnd; x += 10) {
    const y = segment.y + Math.sin((x - segment.startX) / 18) * 3
    if (x === segment.startX) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  }
  context.stroke()
  context.restore()
}

function drawPageAnnotations(context: CanvasRenderingContext2D, progress: number) {
  const segments: readonly UnderlineSegment[] = [
    { startX: 112, endX: 720, y: 434, startAt: 0 },
    { startX: 112, endX: 884, y: 775, startAt: 0.25 },
    { startX: 112, endX: 730, y: 1_020, startAt: 0.5 },
    { startX: 112, endX: 884, y: 1_205, startAt: 0.75 },
  ]
  segments.forEach(segment => drawProgressLine(context, segment, progress))
}

function drawMarginNote(context: CanvasRenderingContext2D, noteLines: readonly string[]) {
  context.save()
  context.translate(690, 860)
  context.rotate(-0.055)
  context.fillStyle = pageColors.pencil
  context.font = '500 31px "Songti SC", "STSong", serif'
  noteLines.forEach((line, lineIndex) => {
    context.fillText(line, 0, lineIndex * 44)
  })
  context.strokeStyle = pageColors.pencilSoft
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(-18, -26)
  context.quadraticCurveTo(-72, -58, -116, -4)
  context.stroke()
  context.restore()
}

function drawTitlePage(context: CanvasRenderingContext2D, annotationProgress: number) {
  preparePage(context)
  const canvas = context.canvas
  context.textAlign = 'center'
  context.fillStyle = pageColors.ink
  context.font = '600 112px "Songti SC", "STSong", serif'
  context.fillText('设计模式', canvas.width / 2, 292)
  context.font = '500 32px system-ui, sans-serif'
  context.fillText('DESIGN PATTERNS', canvas.width / 2, 356)

  context.textAlign = 'left'
  context.fillStyle = pageColors.muted
  context.font = '600 25px ui-monospace, monospace'
  context.fillText('CONTENTS / PRIVATE INDEX', 118, 520)
  context.fillStyle = pageColors.ink
  context.font = '500 32px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText('01  接口文档', 118, 610)
  context.fillText('02  事件架构', 118, 700)
  context.fillText('03  私人书签', 118, 790)
  context.fillText('04  API 网关', 118, 880)
  context.fillStyle = pageColors.muted
  context.font = '400 25px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText('统一复杂入口', 535, 610)
  context.fillText('观察变化关系', 535, 700)
  context.fillText('保留知识路径', 535, 790)
  context.fillText('管理系统边界', 535, 880)

  context.strokeStyle = pageColors.rule
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(118, 970)
  context.lineTo(904, 970)
  context.stroke()
  context.fillStyle = pageColors.pencil
  context.font = '500 30px "Songti SC", "STSong", serif'
  context.fillText('每一页，都是一个可进入的工作现场。', 260, 1_080)
  context.fillStyle = pageColors.muted
  context.font = '400 22px ui-monospace, monospace'
  context.fillText('USE ← → TO TURN · CLICK A PAGE TO OPEN', 196, 1_260)
  drawPageAnnotations(context, annotationProgress)
}

function drawRoutePage(
  context: CanvasRenderingContext2D,
  route: BookRoute,
  annotationProgress: number,
) {
  preparePage(context)
  context.textAlign = 'left'
  context.fillStyle = pageColors.muted
  context.font = '600 23px ui-monospace, monospace'
  context.fillText(route.pattern, 112, 142)
  context.textAlign = 'right'
  context.fillText(route.path.toUpperCase(), 904, 142)

  context.textAlign = 'left'
  context.fillStyle = pageColors.ink
  context.font = '650 78px system-ui, sans-serif'
  route.titleLines.forEach((line, lineIndex) => {
    context.fillText(line, 112, 270 + lineIndex * 82)
  })

  context.fillStyle = pageColors.muted
  context.font = '400 32px "PingFang SC", "Microsoft YaHei", sans-serif'
  route.descriptionLines.forEach((line, lineIndex) => {
    context.fillText(line, 112, 515 + lineIndex * 48)
  })

  context.fillStyle = pageColors.muted
  context.font = '600 22px ui-monospace, monospace'
  context.fillText('THIS PAGE KEEPS', 112, 666)
  context.fillStyle = pageColors.ink
  context.font = '500 29px "PingFang SC", "Microsoft YaHei", sans-serif'
  route.detailLines.forEach((line, lineIndex) => {
    context.fillText(`—  ${line}`, 112, 730 + lineIndex * 62)
  })

  context.strokeStyle = pageColors.rule
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(112, 932)
  context.lineTo(904, 932)
  context.stroke()
  context.fillStyle = pageColors.muted
  context.font = '600 22px ui-monospace, monospace'
  context.fillText('PATTERN NOTE', 112, 982)
  context.fillStyle = pageColors.ink
  context.font = '500 29px "PingFang SC", "Microsoft YaHei", sans-serif'
  route.patternLines.forEach((line, lineIndex) => {
    context.fillText(line, 112, 1_046 + lineIndex * 48)
  })
  drawMarginNote(context, route.noteLines)

  context.fillStyle = pageColors.muted
  context.font = '500 22px ui-monospace, monospace'
  context.fillText('CLICK THIS PAGE TO OPEN', 112, 1_278)
  drawPageAnnotations(context, annotationProgress)
}

function drawClosingPage(
  context: CanvasRenderingContext2D,
  annotationProgress: number,
) {
  preparePage(context)
  context.textAlign = 'left'
  context.fillStyle = pageColors.muted
  context.font = '600 23px ui-monospace, monospace'
  context.fillText('READING NOTES / COLOPHON', 112, 142)

  context.fillStyle = pageColors.ink
  context.font = '650 78px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText('阅读记录', 112, 280)
  context.fillStyle = pageColors.muted
  context.font = '400 31px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText('四个工作入口，四种组织复杂度的方法。', 112, 350)

  context.strokeStyle = pageColors.rule
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(112, 416)
  context.lineTo(904, 416)
  context.stroke()

  context.font = '600 22px ui-monospace, monospace'
  context.fillStyle = pageColors.muted
  context.fillText('INDEX', 112, 476)
  context.fillText('PATTERN', 590, 476)
  context.font = '500 30px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillStyle = pageColors.ink
  bookRoutes.forEach((route, routeIndex) => {
    const y = 554 + routeIndex * 112
    context.fillText(`${String(routeIndex + 1).padStart(2, '0')}  ${route.title}`, 112, y)
    context.font = '500 21px ui-monospace, monospace'
    context.fillText(route.pattern, 590, y)
    context.font = '500 30px "PingFang SC", "Microsoft YaHei", sans-serif'
  })

  context.strokeStyle = pageColors.rule
  context.beginPath()
  context.moveTo(112, 1_050)
  context.lineTo(904, 1_050)
  context.stroke()
  context.fillStyle = pageColors.pencil
  context.font = '500 31px "Songti SC", "STSong", serif'
  context.fillText('翻过这一面，回到目录。', 112, 1_135)
  context.fillStyle = pageColors.muted
  context.font = '500 22px ui-monospace, monospace'
  context.fillText('KEEP TURNING · THE INDEX LOOPS', 112, 1_278)
  drawPageAnnotations(context, annotationProgress)
}

function drawBookPage(
  context: CanvasRenderingContext2D,
  page: BookPage,
  annotationProgress: number,
) {
  if (page.kind === 'route' && page.route) {
    drawRoutePage(context, page.route, annotationProgress)
    return
  }

  if (page.kind === 'closing') {
    drawClosingPage(context, annotationProgress)
    return
  }

  drawTitlePage(context, annotationProgress)
}

function createStaticPageTextures() {
  return bookPages.map(page => {
    const surface = createPageSurface()
    drawBookPage(surface.context, page, 1)
    surface.texture.needsUpdate = true
    return surface.texture
  })
}

function createBackPageTexture(texture: CanvasTexture) {
  const backTexture = texture.clone()
  backTexture.wrapS = RepeatWrapping
  backTexture.repeat.x = -1
  backTexture.offset.x = 1
  backTexture.needsUpdate = true
  return backTexture
}

function createCoverTextures() {
  const colorCanvas = document.createElement('canvas')
  const bumpCanvas = document.createElement('canvas')
  colorCanvas.width = 768
  colorCanvas.height = 768
  bumpCanvas.width = 768
  bumpCanvas.height = 768
  const colorContext = colorCanvas.getContext('2d')
  const bumpContext = bumpCanvas.getContext('2d')
  if (!colorContext || !bumpContext) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const clothGradient = colorContext.createLinearGradient(0, 0, 768, 768)
  clothGradient.addColorStop(0, coverColors.clothLight)
  clothGradient.addColorStop(0.46, coverColors.clothMid)
  clothGradient.addColorStop(1, coverColors.clothDark)
  colorContext.fillStyle = clothGradient
  colorContext.fillRect(0, 0, 768, 768)
  bumpContext.fillStyle = '#777'
  bumpContext.fillRect(0, 0, 768, 768)

  const random = createSeededRandom()
  for (let x = 0; x < 768; x += 3) {
    const offset = random() * 1.4
    colorContext.strokeStyle =
      x % 6 === 0 ? coverColors.fiberLight : coverColors.fiberDark
    colorContext.lineWidth = 0.7 + random() * 0.5
    colorContext.beginPath()
    colorContext.moveTo(x + offset, 0)
    colorContext.lineTo(x - offset, 768)
    colorContext.stroke()

    bumpContext.strokeStyle = x % 6 === 0 ? '#999' : '#5f5f5f'
    bumpContext.lineWidth = 1
    bumpContext.beginPath()
    bumpContext.moveTo(x + offset, 0)
    bumpContext.lineTo(x - offset, 768)
    bumpContext.stroke()
  }

  for (let y = 0; y < 768; y += 4) {
    colorContext.strokeStyle =
      y % 8 === 0 ? coverColors.fiberDark : coverColors.fiberLight
    colorContext.lineWidth = 0.55
    colorContext.beginPath()
    colorContext.moveTo(0, y + random())
    colorContext.lineTo(768, y - random())
    colorContext.stroke()

    bumpContext.strokeStyle = y % 8 === 0 ? '#676767' : '#898989'
    bumpContext.lineWidth = 0.75
    bumpContext.beginPath()
    bumpContext.moveTo(0, y)
    bumpContext.lineTo(768, y)
    bumpContext.stroke()
  }

  const edgeShade = colorContext.createRadialGradient(384, 384, 210, 384, 384, 540)
  edgeShade.addColorStop(0, 'rgba(24, 16, 11, 0)')
  edgeShade.addColorStop(1, 'rgba(24, 16, 11, 0.38)')
  colorContext.fillStyle = edgeShade
  colorContext.fillRect(0, 0, 768, 768)

  colorContext.strokeStyle = coverColors.deboss
  colorContext.lineWidth = 4
  colorContext.strokeRect(28, 28, 712, 712)
  colorContext.lineWidth = 1.5
  colorContext.strokeRect(39, 39, 690, 690)
  bumpContext.strokeStyle = '#464646'
  bumpContext.lineWidth = 4
  bumpContext.strokeRect(28, 28, 712, 712)
  bumpContext.strokeStyle = '#979797'
  bumpContext.lineWidth = 2
  bumpContext.strokeRect(39, 39, 690, 690)

  const colorTexture = new CanvasTexture(colorCanvas)
  colorTexture.colorSpace = SRGBColorSpace
  return {
    bump: new CanvasTexture(bumpCanvas),
    color: colorTexture,
  }
}

function createEndpaperTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const gradient = context.createLinearGradient(0, 0, 512, 512)
  gradient.addColorStop(0, '#c9b38e')
  gradient.addColorStop(0.5, '#9d825f')
  gradient.addColorStop(1, '#6d543d')
  context.fillStyle = gradient
  context.fillRect(0, 0, 512, 512)
  const random = createSeededRandom()
  for (let lineIndex = 0; lineIndex < 42; lineIndex += 1) {
    const y = random() * 512
    context.strokeStyle =
      lineIndex % 2 === 0
        ? 'rgba(242, 226, 193, 0.22)'
        : 'rgba(64, 44, 31, 0.18)'
    context.lineWidth = 1 + random() * 2
    context.beginPath()
    context.moveTo(0, y)
    context.bezierCurveTo(150, y + random() * 38 - 19, 330, y - 24, 512, y + 12)
    context.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function createPageEdgeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 768
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const paperGradient = context.createLinearGradient(0, 0, canvas.width, 0)
  paperGradient.addColorStop(0, '#b9ad96')
  paperGradient.addColorStop(0.18, '#ddd3bf')
  paperGradient.addColorStop(0.82, '#d7cbb5')
  paperGradient.addColorStop(1, '#a99c85')
  context.fillStyle = paperGradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const random = createSeededRandom()
  for (let layerX = 3; layerX < canvas.width; layerX += 3) {
    const shade = 102 + Math.round(random() * 48)
    context.strokeStyle = `rgba(${shade}, ${shade - 8}, ${shade - 18}, ${0.16 + random() * 0.16})`
    context.lineWidth = random() > 0.82 ? 1.4 : 0.65
    context.beginPath()
    context.moveTo(layerX + random(), 0)
    context.lineTo(layerX - random(), canvas.height)
    context.stroke()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function createContactShadowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const gradient = context.createRadialGradient(256, 128, 10, 256, 128, 230)
  gradient.addColorStop(0, 'rgba(37, 31, 24, 0.34)')
  gradient.addColorStop(0.58, 'rgba(37, 31, 24, 0.16)')
  gradient.addColorStop(1, 'rgba(37, 31, 24, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  return new CanvasTexture(canvas)
}

function createAnimatedPage(
  pageSide: 'left' | 'right',
  backTexture: CanvasTexture,
): AnimatedPage {
  const geometry = new PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_SEGMENTS, 2)
  geometry.translate(pageSide === 'right' ? PAGE_WIDTH / 2 : -PAGE_WIDTH / 2, 0, 0)
  const position = geometry.getAttribute('position') as BufferAttribute
  const initialPositions = new Float32Array(position.array as Float32Array)
  const frontMaterial = new MeshStandardMaterial({
    roughness: 0.9,
    metalness: 0,
    side: FrontSide,
  })
  const backMaterial = new MeshStandardMaterial({
    map: backTexture,
    roughness: 0.92,
    metalness: 0,
    side: BackSide,
  })
  const frontMesh = new Mesh(geometry, frontMaterial)
  const backMesh = new Mesh(geometry, backMaterial)
  frontMesh.castShadow = true
  frontMesh.receiveShadow = true
  backMesh.castShadow = true
  backMesh.receiveShadow = true
  const group = new Group()
  group.position.z = pageSide === 'right' ? 0.13 : 0.16
  group.add(frontMesh, backMesh)
  return {
    backMaterial,
    frontMaterial,
    frontMesh,
    geometry,
    group,
    initialPositions,
    turnAngle: pageSide === 'right' ? -Math.PI : Math.PI,
  }
}

function addPaperLayers(book: Group, material: MeshStandardMaterial) {
  const geometry = new PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT)
  for (let layerIndex = 0; layerIndex < PAGE_LAYER_COUNT; layerIndex += 1) {
    const depth = -0.035 + layerIndex * 0.009
    const inset = (PAGE_LAYER_COUNT - layerIndex) * 0.003
    for (const side of [-1, 1]) {
      const layer = new Mesh(geometry, material)
      layer.position.set(side * (PAGE_WIDTH / 2 + inset), 0, depth)
      layer.scale.set(1 - inset, 1 - inset * 0.8, 1)
      layer.receiveShadow = true
      book.add(layer)
    }
  }
}

function addPageEdgePanels(book: Group, material: MeshStandardMaterial) {
  const geometry = new PlaneGeometry(PAGE_BLOCK_DEPTH, PAGE_BLOCK_HEIGHT * 0.985)
  const outerEdgeX = PAGE_BLOCK_CENTER_X + PAGE_BLOCK_WIDTH / 2 + 0.002
  for (const side of [-1, 1]) {
    const pageEdge = new Mesh(geometry, material)
    pageEdge.position.set(side * outerEdgeX, 0, -0.025)
    pageEdge.rotation.y = side * (Math.PI / 2)
    pageEdge.castShadow = true
    pageEdge.receiveShadow = true
    book.add(pageEdge)
  }
}

function createStaticPage(
  pageSide: 'left' | 'right',
  material: MeshStandardMaterial,
) {
  const geometry = new PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_SEGMENTS, 2)
  const position = geometry.getAttribute('position') as BufferAttribute
  for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
    const x = position.getX(vertexIndex)
    const normalizedX =
      pageSide === 'left'
        ? (PAGE_WIDTH / 2 - x) / PAGE_WIDTH
        : (x + PAGE_WIDTH / 2) / PAGE_WIDTH
    const pageCurve = Math.sin(normalizedX * Math.PI)
    position.setZ(vertexIndex, pageCurve * 0.032 + (1 - normalizedX) * 0.008)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  const page = new Mesh(geometry, material)
  page.position.set(pageSide === 'left' ? -PAGE_WIDTH / 2 : PAGE_WIDTH / 2, 0, 0.078)
  page.receiveShadow = true
  return page
}

function addCoverBoards(book: Group, materials: BookCoverMaterials) {
  const boardGeometry = new RoundedBoxGeometry(1.72, 2.39, 0.11, 6, 0.046)
  const clothGeometry = new RoundedBoxGeometry(1.7, 2.355, 0.116, 6, 0.043)
  const endpaperGeometry = new RoundedBoxGeometry(1.57, 2.15, 0.014, 4, 0.026)
  const pageBlockGeometry = new RoundedBoxGeometry(
    PAGE_BLOCK_WIDTH,
    PAGE_BLOCK_HEIGHT,
    PAGE_BLOCK_DEPTH,
    4,
    0.022,
  )
  const pageBlockMaterial = new MeshStandardMaterial({
    color: BOOK_PAGE_EDGE_COLOR,
    roughness: 0.94,
    metalness: 0,
  })
  const pageEdgeMaterial = new MeshStandardMaterial({
    map: createPageEdgeTexture(),
    roughness: 0.96,
    metalness: 0,
  })

  for (const side of [-1, 1]) {
    const board = new Mesh(boardGeometry, materials.boardEdge)
    board.position.set(side * 0.83, 0, -0.151)
    board.rotation.y = side * 0.02
    board.castShadow = true
    board.receiveShadow = true

    const cloth = new Mesh(clothGeometry, materials.cloth)
    cloth.position.set(side * 0.83, 0, -0.15)
    cloth.rotation.y = side * 0.02
    cloth.castShadow = true
    cloth.receiveShadow = true

    const pageBlock = new Mesh(pageBlockGeometry, pageBlockMaterial)
    pageBlock.position.set(side * PAGE_BLOCK_CENTER_X, 0, -0.025)
    pageBlock.rotation.y = side * 0.012
    pageBlock.castShadow = true
    pageBlock.receiveShadow = true

    const endpaper = new Mesh(endpaperGeometry, materials.endpaper)
    endpaper.position.set(side * 0.785, 0, 0.058)
    endpaper.rotation.y = side * 0.009
    endpaper.receiveShadow = true
    book.add(board, cloth, pageBlock, endpaper)
  }

  addPaperLayers(book, pageBlockMaterial)
  addPageEdgePanels(book, pageEdgeMaterial)
}

function addSpineDetails(book: Group, materials: BookCoverMaterials) {
  const spine = new Mesh(
    new CylinderGeometry(0.1, 0.1, 2.25, 28),
    materials.cloth,
  )
  spine.position.z = -0.1
  spine.castShadow = true
  book.add(spine)

  const hingeGeometry = new CylinderGeometry(0.017, 0.017, 2.18, 12)
  for (const side of [-1, 1]) {
    const hinge = new Mesh(hingeGeometry, materials.hinge)
    hinge.position.set(side * 0.104, 0, -0.08)
    hinge.castShadow = true
    book.add(hinge)
  }

  const bandGeometry = new TorusGeometry(0.097, 0.011, 8, 28)
  for (const y of [-0.78, 0, 0.78]) {
    const band = new Mesh(bandGeometry, materials.boardEdge)
    band.position.set(0, y, -0.1)
    band.rotation.x = Math.PI / 2
    band.castShadow = true
    book.add(band)
  }

  const headbandGeometry = new CylinderGeometry(0.022, 0.022, 0.24, 16)
  for (const y of [-1.075, 1.075]) {
    const headband = new Mesh(headbandGeometry, materials.headband)
    headband.position.set(0, y, -0.018)
    headband.rotation.z = Math.PI / 2
    headband.castShadow = true
    book.add(headband)
  }
}

function createBookAssembly(
  pageTextures: CanvasTexture[],
  backPageTextures: CanvasTexture[],
  animatedSurface: PageSurface,
): BookAssembly {
  const book = new Group()
  const coverTextures = createCoverTextures()
  const coverMaterials: BookCoverMaterials = {
    boardEdge: new MeshStandardMaterial({
      color: BOOK_COVER_EDGE_COLOR,
      roughness: 0.78,
      metalness: 0.02,
    }),
    cloth: new MeshStandardMaterial({
      color: 0xf0e6d8,
      map: coverTextures.color,
      bumpMap: coverTextures.bump,
      bumpScale: 0.0065,
      roughness: 0.84,
      metalness: 0.01,
    }),
    endpaper: new MeshStandardMaterial({
      map: createEndpaperTexture(),
      roughness: 0.91,
      metalness: 0,
    }),
    headband: new MeshStandardMaterial({
      color: BOOK_HEADBAND_COLOR,
      roughness: 0.7,
      metalness: 0.04,
    }),
    hinge: new MeshStandardMaterial({
      color: BOOK_HINGE_COLOR,
      roughness: 0.88,
      metalness: 0,
    }),
  }
  addCoverBoards(book, coverMaterials)
  addSpineDetails(book, coverMaterials)

  const leftPageMaterial = new MeshStandardMaterial({
    map: pageTextures[0],
    roughness: 0.92,
    metalness: 0,
    side: FrontSide,
  })
  const leftPage = createStaticPage('left', leftPageMaterial)
  book.add(leftPage)

  const rightPageMaterial = new MeshStandardMaterial({
    map: pageTextures[2],
    roughness: 0.92,
    metalness: 0,
    side: FrontSide,
  })
  const rightPage = createStaticPage('right', rightPageMaterial)
  book.add(rightPage)

  const forwardPage = createAnimatedPage('right', backPageTextures[2])
  const backwardPage = createAnimatedPage(
    'left',
    backPageTextures[backPageTextures.length - 1],
  )
  forwardPage.frontMaterial.map = animatedSurface.texture
  backwardPage.frontMaterial.map = animatedSurface.texture
  backwardPage.group.visible = false
  book.add(forwardPage.group, backwardPage.group)

  const shadowMaterial = new MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.78,
  })
  const contactShadow = new Mesh(new PlaneGeometry(4.25, 2.85), shadowMaterial)
  contactShadow.position.set(0.08, -0.08, -0.31)
  book.add(contactShadow)

  book.rotation.set(-0.3, -0.1, -0.022)
  book.scale.setScalar(1.05)
  return {
    backwardPage,
    book,
    forwardPage,
    leftPage,
    leftPageMaterial,
    rightPage,
    rightPageMaterial,
  }
}

function createBookView(elements: BookElements): BookView {
  const renderer = new WebGLRenderer({
    canvas: elements.canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setClearColor(BOOK_COVER_COLOR, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap

  const scene = new Scene()
  const camera = new PerspectiveCamera(36, 1, 0.1, 100)
  camera.position.set(0, 0.1, CAMERA_BASE_DISTANCE)
  const pageTextures = createStaticPageTextures()
  const backPageTextures = pageTextures.map(createBackPageTexture)
  const animatedSurface = createPageSurface()
  const assembly = createBookAssembly(pageTextures, backPageTextures, animatedSurface)
  scene.add(assembly.book)

  const ambientLight = new AmbientLight(KEY_LIGHT_COLOR, 1.08)
  const keyLight = new DirectionalLight(KEY_LIGHT_COLOR, 2.35)
  keyLight.position.set(3, 4, 6)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1_024, 1_024)
  keyLight.shadow.bias = -0.0008
  const fillLight = new DirectionalLight(FILL_LIGHT_COLOR, 0.62)
  fillLight.position.set(-4, -2, 4)
  scene.add(ambientLight, keyLight, fillLight)

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
  pageTextures.concat(backPageTextures).forEach(texture => {
    texture.anisotropy = maxAnisotropy
  })
  animatedSurface.texture.anisotropy = maxAnisotropy

  return {
    activeRouteIndex: 1,
    animatedSurface,
    assembly,
    camera,
    caption: document.getElementById('portal-book-caption'),
    cycleStartedAt: performance.now(),
    direction: 'next',
    elements,
    isAutoPaused: false,
    isManualCycle: false,
    isTurnCompletionPending: false,
    lastAnnotationStep: -1,
    lastDrawnPageIndex: -1,
    lastFrameAt: performance.now(),
    leftPageIndex: 0,
    backPageTextures,
    pageTextures,
    raycaster: new Raycaster(),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
    renderer,
    scene,
  }
}

function resizeRenderer(view: BookView) {
  const canvas = view.renderer.domElement
  const cssWidth = Math.max(1, canvas.clientWidth)
  const cssHeight = Math.max(1, canvas.clientHeight)
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
  const bufferWidth = Math.floor(cssWidth * pixelRatio)
  const bufferHeight = Math.floor(cssHeight * pixelRatio)

  if (canvas.width === bufferWidth && canvas.height === bufferHeight) {
    return
  }

  view.renderer.setSize(bufferWidth, bufferHeight, false)
  view.camera.aspect = cssWidth / cssHeight
  view.camera.position.z = Math.max(
    CAMERA_BASE_DISTANCE,
    CAMERA_FIT_FACTOR / view.camera.aspect,
  )
  view.camera.updateProjectionMatrix()
}

function smoothProgress(progress: number) {
  return progress * progress * (3 - 2 * progress)
}

function updateAnimatedPage(page: AnimatedPage, progress: number) {
  const easedProgress = smoothProgress(progress)
  const position = page.geometry.getAttribute('position') as BufferAttribute
  const turnBend = Math.sin(progress * Math.PI) * PAGE_BEND

  for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
    const arrayIndex = vertexIndex * 3
    const initialX = page.initialPositions[arrayIndex]
    const initialY = page.initialPositions[arrayIndex + 1]
    const initialZ = page.initialPositions[arrayIndex + 2]
    const normalizedX = Math.abs(initialX / PAGE_WIDTH)
    const pageCurve = Math.sin(normalizedX * Math.PI)
    position.setY(vertexIndex, initialY + pageCurve * turnBend * 0.035)
    position.setZ(
      vertexIndex,
      initialZ + pageCurve * (BASE_PAGE_BOW + turnBend),
    )
  }

  position.needsUpdate = true
  page.geometry.computeVertexNormals()
  page.group.rotation.y = page.turnAngle * easedProgress
  page.group.position.z = 0.13 + Math.sin(progress * Math.PI) * 0.045
}

function pageIndexAfter(index: number) {
  return (index + 1) % bookPages.length
}

function pageIndexBefore(index: number) {
  return (index - 1 + bookPages.length) % bookPages.length
}

function spreadIndexAfter(index: number) {
  return pageIndexAfter(pageIndexAfter(index))
}

function spreadIndexBefore(index: number) {
  return pageIndexBefore(pageIndexBefore(index))
}

function redrawAnimatedPage(view: BookView, pageIndex: number, progress: number) {
  const annotationStep = Math.round(progress * ANNOTATION_STEPS)
  if (
    view.lastDrawnPageIndex === pageIndex &&
    view.lastAnnotationStep === annotationStep
  ) {
    return
  }

  view.lastDrawnPageIndex = pageIndex
  view.lastAnnotationStep = annotationStep
  drawBookPage(
    view.animatedSurface.context,
    bookPages[pageIndex],
    annotationStep / ANNOTATION_STEPS,
  )
  view.animatedSurface.texture.needsUpdate = true
}

function setMaterialTexture(material: MeshStandardMaterial, texture: CanvasTexture) {
  material.map = texture
}

function configureNextCycle(view: BookView) {
  const frontPageIndex = pageIndexAfter(view.leftPageIndex)
  const backPageIndex = pageIndexAfter(frontPageIndex)
  const revealedRightPageIndex = pageIndexAfter(backPageIndex)
  view.direction = 'next'
  setMaterialTexture(
    view.assembly.leftPageMaterial,
    view.pageTextures[view.leftPageIndex],
  )
  setMaterialTexture(
    view.assembly.rightPageMaterial,
    view.pageTextures[revealedRightPageIndex],
  )
  redrawAnimatedPage(view, frontPageIndex, 0)
  setMaterialTexture(
    view.assembly.forwardPage.frontMaterial,
    view.animatedSurface.texture,
  )
  setMaterialTexture(
    view.assembly.forwardPage.backMaterial,
    view.backPageTextures[backPageIndex],
  )
  view.assembly.forwardPage.group.visible = true
  view.assembly.backwardPage.group.visible = false
  updateAnimatedPage(view.assembly.forwardPage, 0)
}

function configurePreviousCycle(view: BookView) {
  const previousLeftPageIndex = spreadIndexBefore(view.leftPageIndex)
  const previousRightPageIndex = pageIndexBefore(view.leftPageIndex)
  const currentRightPageIndex = pageIndexAfter(view.leftPageIndex)
  view.direction = 'previous'
  setMaterialTexture(
    view.assembly.leftPageMaterial,
    view.pageTextures[previousLeftPageIndex],
  )
  setMaterialTexture(
    view.assembly.rightPageMaterial,
    view.pageTextures[currentRightPageIndex],
  )
  setMaterialTexture(
    view.assembly.forwardPage.frontMaterial,
    view.pageTextures[currentRightPageIndex],
  )
  setMaterialTexture(
    view.assembly.forwardPage.backMaterial,
    view.backPageTextures[pageIndexAfter(currentRightPageIndex)],
  )
  redrawAnimatedPage(view, view.leftPageIndex, 0)
  setMaterialTexture(
    view.assembly.backwardPage.frontMaterial,
    view.animatedSurface.texture,
  )
  setMaterialTexture(
    view.assembly.backwardPage.backMaterial,
    view.backPageTextures[previousRightPageIndex],
  )
  view.assembly.forwardPage.group.visible = true
  view.assembly.backwardPage.group.visible = true
  updateAnimatedPage(view.assembly.forwardPage, 0)
  updateAnimatedPage(view.assembly.backwardPage, 0)
}

function getCycleTimeline(view: BookView, time: number): CycleTimeline {
  const elapsedTime = Math.max(0, time - view.cycleStartedAt)
  if (elapsedTime < PAGE_HOLD_DURATION_MS) {
    return { annotationProgress: 0, phase: 'holding', turnProgress: 0 }
  }

  const annotationElapsed = elapsedTime - PAGE_HOLD_DURATION_MS
  if (annotationElapsed < ANNOTATION_DURATION_MS) {
    return {
      annotationProgress: annotationElapsed / ANNOTATION_DURATION_MS,
      phase: 'drawing',
      turnProgress: 0,
    }
  }

  return {
    annotationProgress: 1,
    phase: 'turning',
    turnProgress: Math.min(
      1,
      (elapsedTime - PAGE_HOLD_DURATION_MS - ANNOTATION_DURATION_MS) /
        PAGE_TURN_DURATION_MS,
    ),
  }
}

function getPageLabel(page: BookPage) {
  if (page.route) {
    return page.route.title
  }
  return page.kind === 'title' ? '目录' : '阅读记录'
}

function updateAccessiblePage(view: BookView) {
  const rightPageIndex = pageIndexAfter(view.leftPageIndex)
  const leftPage = bookPages[view.leftPageIndex]
  const rightPage = bookPages[rightPageIndex]
  const activePageIndex = rightPage.route
    ? rightPageIndex
    : leftPage.route
      ? view.leftPageIndex
      : rightPageIndex
  const activeRoute = bookPages[activePageIndex].route
  const leftPageLabel = getPageLabel(leftPage)
  const rightPageLabel = getPageLabel(rightPage)
  view.activeRouteIndex = activePageIndex
  view.renderer.domElement.dataset.routeReady = 'true'
  view.renderer.domElement.setAttribute(
    'aria-label',
    activeRoute
      ? `设计模式：左页为 ${leftPageLabel}，右页为 ${rightPageLabel}，按回车进入 ${activeRoute.title}，按左右方向键翻页`
      : `设计模式：左页为 ${leftPageLabel}，右页为 ${rightPageLabel}，按左右方向键翻页`,
  )
  if (view.caption) {
    view.caption.textContent = `${leftPageLabel} · ${rightPageLabel}`
  }
}

function updateControlState(view: BookView, phase: CyclePhase) {
  const figure = view.renderer.domElement.closest('.portal-book') as HTMLElement | null
  view.renderer.domElement.dataset.phase = phase
  if (figure) {
    figure.dataset.phase = phase
  }
}

function completeTurn(view: BookView, time: number) {
  view.leftPageIndex =
    view.direction === 'next'
      ? spreadIndexAfter(view.leftPageIndex)
      : spreadIndexBefore(view.leftPageIndex)
  view.cycleStartedAt = time
  view.isManualCycle = false
  view.lastDrawnPageIndex = -1
  view.lastAnnotationStep = -1
  view.isTurnCompletionPending = false
  configureNextCycle(view)
  updateAccessiblePage(view)
}

function renderAnimatedFrame(view: BookView, time: number) {
  resizeRenderer(view)
  if (view.isTurnCompletionPending) {
    completeTurn(view, time)
  }
  if (view.isAutoPaused && !view.isManualCycle) {
    view.cycleStartedAt += Math.max(0, time - view.lastFrameAt)
  }
  view.lastFrameAt = time
  const timeline = getCycleTimeline(view, time)
  const animatedPageIndex =
    view.direction === 'next'
      ? pageIndexAfter(view.leftPageIndex)
      : view.leftPageIndex
  redrawAnimatedPage(view, animatedPageIndex, timeline.annotationProgress)
  const animatedPage =
    view.direction === 'next'
      ? view.assembly.forwardPage
      : view.assembly.backwardPage
  updateAnimatedPage(animatedPage, timeline.turnProgress)
  updateControlState(view, timeline.phase)

  view.renderer.render(view.scene, view.camera)
  if (time - view.cycleStartedAt >= PAGE_CYCLE_DURATION_MS) {
    view.isTurnCompletionPending = true
  }
}

function configureStaticSpread(view: BookView) {
  const frontPageIndex = pageIndexAfter(view.leftPageIndex)
  const backPageIndex = pageIndexAfter(frontPageIndex)
  const revealedRightPageIndex = pageIndexAfter(backPageIndex)
  setMaterialTexture(
    view.assembly.leftPageMaterial,
    view.pageTextures[view.leftPageIndex],
  )
  setMaterialTexture(
    view.assembly.rightPageMaterial,
    view.pageTextures[revealedRightPageIndex],
  )
  setMaterialTexture(
    view.assembly.forwardPage.frontMaterial,
    view.pageTextures[frontPageIndex],
  )
  setMaterialTexture(
    view.assembly.forwardPage.backMaterial,
    view.backPageTextures[backPageIndex],
  )
  view.assembly.forwardPage.group.visible = true
  view.assembly.backwardPage.group.visible = false
  updateAnimatedPage(view.assembly.forwardPage, 0)
  updateControlState(view, 'holding')
  updateAccessiblePage(view)
}

function renderStaticFrame(view: BookView) {
  resizeRenderer(view)
  configureStaticSpread(view)
  view.renderer.render(view.scene, view.camera)
}

function getPointerRoute(view: BookView, clientX: number, clientY: number) {
  if (view.direction === 'previous' || view.renderer.domElement.dataset.phase === 'turning') {
    return null
  }

  const canvas = view.renderer.domElement
  const bounds = canvas.getBoundingClientRect()
  const pointer = new Vector2(
    ((clientX - bounds.left) / bounds.width) * 2 - 1,
    -((clientY - bounds.top) / bounds.height) * 2 + 1,
  )
  view.raycaster.setFromCamera(pointer, view.camera)
  const pages = [view.assembly.forwardPage.frontMesh, view.assembly.leftPage]
  const intersection = view.raycaster.intersectObjects(pages, false)[0]
  if (!intersection) {
    return null
  }

  const pageIndex =
    intersection.object === view.assembly.leftPage
      ? view.leftPageIndex
      : pageIndexAfter(view.leftPageIndex)
  return bookPages[pageIndex].route ?? null
}

function navigateToRoute(route: BookRoute) {
  window.location.assign(route.href)
}

function startManualTurn(view: BookView, direction: TurnDirection) {
  if (view.reducedMotion.matches) {
    view.leftPageIndex =
      direction === 'next'
        ? spreadIndexAfter(view.leftPageIndex)
        : spreadIndexBefore(view.leftPageIndex)
    renderStaticFrame(view)
    return
  }

  const time = performance.now()
  const timeline = getCycleTimeline(view, time)
  if (timeline.phase === 'turning') {
    return
  }

  if (direction === 'next' && view.direction === 'next' && timeline.phase === 'drawing') {
    return
  }

  view.cycleStartedAt = time - PAGE_HOLD_DURATION_MS
  view.isManualCycle = true
  view.isTurnCompletionPending = false
  view.lastDrawnPageIndex = -1
  view.lastAnnotationStep = -1
  if (direction === 'next') {
    configureNextCycle(view)
  } else {
    configurePreviousCycle(view)
  }
}

function isActivationKey(event: KeyboardEvent) {
  return event.key === 'Enter' || event.key === ' '
}

function disposeBookView(view: BookView) {
  view.renderer.setAnimationLoop(null)
  const geometries = new Set<Mesh['geometry']>()
  const materials = new Set<Material>()
  const textures = new Set<Texture>()

  view.scene.traverse(object => {
    if (!(object instanceof Mesh)) {
      return
    }
    geometries.add(object.geometry)
    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material]
    objectMaterials.forEach(material => materials.add(material))
  })

  materials.forEach(material => {
    Object.values(material).forEach(value => {
      if (value instanceof Texture) {
        textures.add(value)
      }
    })
    material.dispose()
  })
  geometries.forEach(geometry => geometry.dispose())
  view.pageTextures.forEach(texture => textures.add(texture))
  view.backPageTextures.forEach(texture => textures.add(texture))
  textures.add(view.animatedSurface.texture)
  textures.forEach(texture => texture.dispose())
  view.renderer.dispose()
}

export function initializeBookAnimation(elements: BookElements) {
  const view = createBookView(elements)
  const figure = elements.canvas.closest('.portal-book') as HTMLElement | null
  configureNextCycle(view)
  updateAccessiblePage(view)
  const renderFrame = (time: number) => renderAnimatedFrame(view, time)

  function applyMotionPreference() {
    if (view.reducedMotion.matches) {
      view.renderer.setAnimationLoop(null)
      renderStaticFrame(view)
      return
    }

    view.cycleStartedAt = performance.now()
    view.lastFrameAt = performance.now()
    configureNextCycle(view)
    renderFrame(performance.now())
    view.renderer.setAnimationLoop(renderFrame)
  }

  const handlePointerMove = (event: PointerEvent) => {
    elements.canvas.style.cursor = getPointerRoute(view, event.clientX, event.clientY)
      ? 'pointer'
      : 'default'
  }
  const handleClick = (event: MouseEvent) => {
    const route = getPointerRoute(view, event.clientX, event.clientY)
    if (route) {
      navigateToRoute(route)
    }
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      startManualTurn(view, event.key === 'ArrowRight' ? 'next' : 'previous')
      return
    }
    if (!isActivationKey(event)) {
      return
    }

    const route = bookPages[view.activeRouteIndex].route
    if (route) {
      event.preventDefault()
      navigateToRoute(route)
    }
  }
  const pauseAutoReading = () => {
    view.isAutoPaused = true
  }
  const resumeAutoReading = (event: FocusEvent | PointerEvent) => {
    if (
      event instanceof FocusEvent &&
      event.relatedTarget instanceof Node &&
      figure?.contains(event.relatedTarget)
    ) {
      return
    }
    view.isAutoPaused = false
  }
  const handleResize = () => {
    if (view.reducedMotion.matches) {
      renderStaticFrame(view)
    } else {
      renderAnimatedFrame(view, performance.now())
    }
  }

  const resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(elements.canvas)
  elements.canvas.addEventListener('pointermove', handlePointerMove)
  elements.canvas.addEventListener('click', handleClick)
  elements.canvas.addEventListener('keydown', handleKeyDown)
  figure?.addEventListener('pointerenter', pauseAutoReading)
  figure?.addEventListener('pointerleave', resumeAutoReading)
  figure?.addEventListener('focusin', pauseAutoReading)
  figure?.addEventListener('focusout', resumeAutoReading)
  view.reducedMotion.addEventListener('change', applyMotionPreference)
  applyMotionPreference()

  return () => {
    resizeObserver.disconnect()
    elements.canvas.removeEventListener('pointermove', handlePointerMove)
    elements.canvas.removeEventListener('click', handleClick)
    elements.canvas.removeEventListener('keydown', handleKeyDown)
    figure?.removeEventListener('pointerenter', pauseAutoReading)
    figure?.removeEventListener('pointerleave', resumeAutoReading)
    figure?.removeEventListener('focusin', pauseAutoReading)
    figure?.removeEventListener('focusout', resumeAutoReading)
    view.reducedMotion.removeEventListener('change', applyMotionPreference)
    disposeBookView(view)
  }
}
