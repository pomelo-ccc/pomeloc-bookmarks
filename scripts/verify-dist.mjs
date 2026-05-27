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
const distFiles = collectFiles(distDir.pathname)
const distText = distFiles
  .filter(file => /\.(html|css|js)$/.test(file))
  .map(file => readFileSync(file, 'utf8'))
  .join('\n')

assert(rootIndex.includes('/bookmarks/'), 'root portal is missing /bookmarks/ entry')
assert(rootIndex.includes('/api/'), 'root portal is missing /api/ entry')
assert(rootIndex.includes('surface-select'), 'root portal is missing surface selector')
assert(!rootIndex.includes('LinkHub - Admin'), 'root portal still looks like the bookmarks app shell')

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
