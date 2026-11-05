/**
 * P2 侧栏会话行归档对齐 soft · 源码不变式（leo Must×5 tip 自核）
 * flat/status 同形 onArchive；壳文件关键符号未改；零扩张。
 */
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "../../../../../..")

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8")
}

function sha256(...parts: string[]) {
  return createHash("sha256").update(read(...parts)).digest("hex")
}

const ON_ARCHIVE = /onArchive=\{\(\)\s*=>\s*requestArchiveSession\(session\.id\)\}/

test("Must1 · flat + status 同形补 onArchive；菜单壳仍 archive testid / 非 destructive", () => {
  const repos = read("apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-repos.tsx")
  const status = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-status-groups.tsx"
  )
  const menu = read("apps/desktop/src/renderer/src/components/ai-chat/sidebar/session-row-menu.tsx")

  // flat 块：sidebar-session-virt-flat 附近有同形 onArchive
  const flatIdx = repos.indexOf('listTestId="sidebar-session-virt-flat"')
  assert.ok(flatIdx >= 0, "flat VirtList 存在")
  const flatChunk = repos.slice(flatIdx, flatIdx + 900)
  assert.match(flatChunk, ON_ARCHIVE)

  // status 各组 renderRow 同形
  assert.match(status, ON_ARCHIVE)
  assert.match(
    status,
    /import \{\s*requestArchiveSession\s*\}\s*from\s*["']@renderer\/hooks\/deny-then-archive["']/
  )

  // 菜单壳：同文案/图标/testid；非 destructive
  assert.match(menu, /data-testid="session-row-menu-archive"/)
  assert.match(menu, /RiInboxArchiveLine/)
  assert.match(menu, /chat\.archiveSession/)
  assert.match(menu, /className="cursor-pointer"/)
  // 归档项本身不挂 destructive（允许文件别处有 destructive 词）
  const archiveBlock = menu.slice(
    menu.indexOf('data-testid="session-row-menu-archive"'),
    menu.indexOf('data-testid="session-row-menu-archive"') + 280
  )
  assert.doesNotMatch(archiveBlock, /destructive/)
})

test("Must2 · 强制走 requestArchiveSession；flat/status/loose/project 同入口", () => {
  const repos = read("apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-repos.tsx")
  const status = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-status-groups.tsx"
  )
  const workspace = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-workspace-row.tsx"
  )
  const deny = read("apps/desktop/src/renderer/src/hooks/deny-then-archive.ts")

  assert.match(repos, /import \{\s*requestArchiveSession\s*\}\s*from\s*["']@renderer\/hooks\/deny-then-archive["']/)
  assert.match(status, /requestArchiveSession/)
  assert.match(workspace, ON_ARCHIVE)
  // loose 仍在
  const looseIdx = repos.indexOf('listTestId="sidebar-session-virt-loose"')
  assert.ok(looseIdx >= 0)
  assert.match(repos.slice(looseIdx, looseIdx + 900), ON_ARCHIVE)
  assert.match(deny, /export\s+(async\s+)?function\s+requestArchiveSession|export\s+const\s+requestArchiveSession/)
})

test("Must3 · status 已补 import；与 loose 同形", () => {
  const status = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-status-groups.tsx"
  )
  assert.match(
    status,
    /import \{\s*requestArchiveSession\s*\}\s*from\s*["']@renderer\/hooks\/deny-then-archive["']/
  )
  assert.match(status, ON_ARCHIVE)
})

test("Must4 · 零壳改：virt-list / virtua-scroll 关键符号与 tip 基线一致", () => {
  const virt = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-session-virt-list.tsx"
  )
  const scroll = read("apps/desktop/src/renderer/src/lib/session-list-virtua-scroll.ts")
  assert.match(virt, /from ["']virtua["']/)
  assert.match(virt, /Virtualizer/)
  assert.match(virt, /SIDEBAR_SESSION_ITEM_ESTIMATE|itemSize=\{/)
  assert.match(virt, /keepMounted/)
  assert.match(virt, /registerSessionListVirtuaScroller/)
  assert.match(scroll, /scrollToIndex|registerSessionListVirtuaScroller/)
  assert.match(scroll, /revealSidebarSession/)
  // tip 基线 tip@da7a27a0 壳 hash（本刀禁改）
  assert.equal(
    sha256("apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-session-virt-list.tsx"),
    "4964c65de11ba3e7b667000cf4db5d5c5e01b411ec14cb9b1440a8d36a7bd899"
  )
  assert.equal(
    sha256("apps/desktop/src/renderer/src/lib/session-list-virtua-scroll.ts"),
    "e916cd11ea26930661a0f2bec2cd7debbf893aca35db777624dd41ffc474cb13"
  )
})

test("Must5 · 零扩张 / 诚实文案；禁平行菜单 / destructive 另皮关键词落点", () => {
  const repos = read("apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-repos.tsx")
  const status = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-status-groups.tsx"
  )
  const virt = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-session-virt-list.tsx"
  )
  assert.doesNotMatch(repos, /tinykeys|@headless-tree|事件批/)
  assert.doesNotMatch(status, /tinykeys|@headless-tree|事件批/)
  assert.doesNotMatch(virt, /PermissionDock/)
  assert.doesNotMatch(repos, /菜单全面重构|性能大升级|全面对齐升级/)
  assert.doesNotMatch(status, /菜单全面重构|性能大升级/)
  assert.doesNotMatch(repos + status, /\bI3\b|ink\/⑤/)
})
