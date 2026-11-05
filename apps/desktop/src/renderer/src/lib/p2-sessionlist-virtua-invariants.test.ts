/**
 * P2 侧栏 SessionList virtua soft · 源码不变式（leo Must×5 tip 自核）
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "../../../../../..")

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8")
}

test("Must1 · 同库 virtua@0.49.3；侧栏会话行 Virtualizer；无写死永久 itemSize 当唯一真值以外的双挂", () => {
  const virt = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-session-virt-list.tsx"
  )
  const pkg = read("apps/desktop/package.json")
  const catalog = read("pnpm-workspace.yaml")
  assert.match(virt, /from ["']virtua["']/)
  assert.match(virt, /Virtualizer/)
  assert.match(virt, /scrollRef=\{scrollRef\}/)
  assert.match(virt, /SIDEBAR_SESSION_ITEM_ESTIMATE|itemSize=\{/)
  assert.match(pkg, /"virtua"/)
  assert.match(catalog, /virtua:\s*0\.49\.3/)
})

test("Must2 · 零双挂；不把线程 ConversationContent virtua 当本刀主交付改动面", () => {
  const virt = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-session-virt-list.tsx"
  )
  const pkg = read("apps/desktop/package.json")
  const thread = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-thread.tsx")
  assert.doesNotMatch(virt, /@tanstack\/react-virtual/)
  assert.doesNotMatch(pkg, /@tanstack\/react-virtual/)
  // 线程 virtua 仍在（#213 不回退），本刀文件不重开线程层
  assert.match(thread, /from ["']virtua["']/)
  assert.doesNotMatch(virt, /ThreadTurnBlock|ConversationContent/)
})

test("Must3 · 落点 sidebar-repos 同构 → virt；SidebarActiveSessions 无 virt 钉住", () => {
  const repos = read("apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-repos.tsx")
  const workspace = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-workspace-row.tsx"
  )
  const status = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-status-groups.tsx"
  )
  const active = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-active-sessions.tsx"
  )
  const shell = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-sidebar.tsx")
  assert.match(repos, /SidebarSessionVirtList/)
  assert.match(repos, /sidebar-session-virt-flat/)
  assert.match(repos, /sidebar-session-virt-loose/)
  assert.match(workspace, /SidebarSessionVirtList/)
  assert.match(status, /SidebarSessionVirtList/)
  assert.doesNotMatch(active, /from ["']virtua["']|Virtualizer|VList|SidebarSessionVirtList/)
  assert.match(active, /active\.map\(/)
  assert.match(shell, /sidebar-session-scroll|SidebarScrollProvider/)
  assert.match(shell, /overflow-y-auto/)
})

test("Must4 · 高亮契约 + 菜单 portal/sessionId 锚 + sessionId→scrollToIndex", () => {
  const scroll = read("apps/desktop/src/renderer/src/lib/session-list-virtua-scroll.ts")
  const menu = read("apps/desktop/src/renderer/src/components/ai-chat/sidebar/session-row-menu.tsx")
  const keep = read("apps/desktop/src/renderer/src/lib/session-menu-keep-mounted.ts")
  const highlight = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/session-row-highlight.ts"
  )
  const virt = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-session-virt-list.tsx"
  )
  assert.match(scroll, /scrollToSessionId/)
  assert.match(scroll, /scrollToIndex|registerSessionListVirtuaScroller/)
  assert.match(scroll, /revealSidebarSession/)
  assert.match(scroll, /data-session-scroll-flash/)
  assert.match(scroll, /400/)
  assert.match(scroll, /prefers-reduced-motion:\s*reduce/)
  assert.match(highlight, /isSessionRowActive/)
  assert.match(menu, /setOpenSessionMenuId/)
  assert.match(menu, /sessionMenuAlign|SESSION_MENU_COLLISION/)
  assert.match(keep, /getOpenSessionMenuId|setOpenSessionMenuId/)
  assert.match(virt, /keepMounted/)
})

test("Must5 · 零扩张 / 诚实文案；钉住组不进可卸载行；Dock 不进侧栏虚拟行", () => {
  const virt = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-session-virt-list.tsx"
  )
  const repos = read("apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-repos.tsx")
  const shell = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-sidebar.tsx")
  assert.doesNotMatch(virt, /全面 virtua|性能大升级|性能翻倍|侧栏全面重构/)
  assert.doesNotMatch(repos, /tinykeys|@headless-tree|事件批/)
  assert.doesNotMatch(shell, /PermissionDock/)
  assert.doesNotMatch(virt, /PermissionDock/)
  assert.doesNotMatch(virt, /\bI3\b|ink\/⑤/)
})
