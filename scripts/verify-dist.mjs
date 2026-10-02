import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const distDir = new URL('../dist/', import.meta.url)
const rootIndexPath = join(distDir.pathname, 'index.html')
const bookmarksIndexPath = join(distDir.pathname, 'bookmarks', 'index.html')

assert(existsSync(rootIndexPath), 'missing dist/index.html')
assert(existsSync(bookmarksIndexPath), 'missing dist/bookmarks/index.html')

const rootIndex = readFileSync(rootIndexPath, 'utf8')
const bookmarksIndex = readFileSync(bookmarksIndexPath, 'utf8')
const consoleIndexPath = join(distDir.pathname, 'console', 'index.html')
assert(existsSync(consoleIndexPath), 'missing dist/console/index.html')
const distFiles = collectFiles(distDir.pathname)
const distText = distFiles
  .filter(file => /\.(html|css|js)$/.test(file))
  .map(file => readFileSync(file, 'utf8'))
  .join('\n')

// 首页现在由 JS 渲染服务列表，服务路径来自后端 /public/overview，
// 不再写死在 HTML 里。这里只断言不变量。
assert(rootIndex.includes('/console/'), 'root portal is missing /console/ entry')
assert(rootIndex.includes('id="field"'), 'root portal is missing the signal field canvas')
assert(rootIndex.includes('id="services"'), 'root portal is missing the service list container')
assert(!rootIndex.includes('/api/'), 'root portal still links the removed /api/ service')
assert(!rootIndex.includes('LinkHub - Admin'), 'root portal still looks like the bookmarks app shell')

// 首页与后端的目标清单必须一致：后端不返回路径的目标不该出现在导航里
const portalJs = distFiles.find(f => /assets\/main-[\w-]+\.js$/.test(f))
assert(portalJs, 'missing the portal bundle')
const apiSource = readFileSync(new URL('../server/console-api.mjs', import.meta.url), 'utf8')
const publicPaths = [...apiSource.matchAll(/path: '(\/[^']+)'/g)].map(m => m[1])
assert(publicPaths.length >= 5, `expected at least 5 public service paths, got ${publicPaths.length}`)

assert(bookmarksIndex.includes('id="app"'), 'bookmarks entry is missing Vue mount point')
assert(distText.includes('data-home-link'), 'bookmarks build is missing the home portal link marker')

function collectFiles(dir) {
  return readdirSync(dir).flatMap(entry => {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      return collectFiles(fullPath)
    }
    return [fullPath]
  })
}
