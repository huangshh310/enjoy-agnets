/**
 * P2 列表边界 soft · 源码不变式（leo Must×5 tip 自核）
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

test("Must1 · 仅 ai-chat-thread turn 列表挂 virtua Virtualizer", () => {
  const thread = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-thread.tsx")
  assert.match(thread, /from ["']virtua["']/)
  assert.match(thread, /Virtualizer/)
  assert.match(thread, /scrollRef=\{scrollRef\}/)
  assert.doesNotMatch(thread, /visible\.map\(\(message,\s*index\)\s*=>/)
  assert.doesNotMatch(thread, /itemSize=\{/)
  assert.match(thread, /<QueuedFollowups\s*\/>/)
  assert.match(thread, /id="thread-turn-end"/)
})

test("Must2 · PermissionDock 保持 Conversation/VList 外（chat-stage / composer-cluster）", () => {
  const stage = read("apps/desktop/src/renderer/src/components/app-shell/chat/chat-stage.tsx")
  const cluster = read("apps/desktop/src/renderer/src/components/app-shell/chat/chat-composer-cluster.tsx")
  const thread = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-thread.tsx")
  const dock = read("apps/desktop/src/renderer/src/components/ai-chat/attention/permission-dock.tsx")
  assert.match(stage, /PermissionDock/)
  assert.match(cluster, /PermissionDock/)
  assert.doesNotMatch(thread, /import\s*\{[^}]*PermissionDock|<[\s]*PermissionDock/)
  assert.match(dock, /禁止写进 ConversationContent|permission-dock/)
})

test("Must3 · 找条走 messageId→virtua scrollToIndex；短高亮 ≤~400ms", () => {
  const reveal = read("apps/desktop/src/renderer/src/lib/search-thread-messages.ts")
  const registry = read("apps/desktop/src/renderer/src/lib/thread-virtua-scroll.ts")
  const findBar = read(
    "apps/desktop/src/renderer/src/components/ai-chat/thread/thread-find/thread-find-bar.tsx"
  )
  assert.match(registry, /scrollToMessageId/)
  assert.match(reveal, /scrollThreadVirtuaToMessage|hasThreadVirtuaScroller/)
  assert.match(reveal, /hasThreadVirtuaScroller\(\)/)
  // 共用 rim：reveal 路径写入；找条只调同一 API，禁双实现
  assert.match(reveal, /flashThreadFindActive/)
  assert.match(reveal, /data-thread-find-active/)
  assert.match(reveal, /ring-2/)
  assert.match(reveal, /ring-accent-500/)
  assert.match(reveal, /400/)
  assert.match(reveal, /prefers-reduced-motion:\s*reduce/)
  assert.match(reveal, /flashThreadFindActive\(messageId\)/)
  assert.match(findBar, /clearThreadFindActive|flashThreadFindActive/)
  assert.match(findBar, /revealThreadFindMatch/)
  assert.doesNotMatch(findBar, /setAttribute\(\s*["']data-thread-find-active/)
})

test("Must4 · stick-to-bottom 外壳保留；scroll 容器喂 stick 上下文", () => {
  const thread = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-thread.tsx")
  const conversation = read("packages/ui/components/ai-elements/conversation.tsx")
  assert.match(thread, /<Conversation[\s>]/)
  assert.match(thread, /ConversationScrollOnChange/)
  assert.match(thread, /ConversationViewportStick/)
  assert.match(thread, /useStickToBottomContext/)
  assert.match(conversation, /StickToBottom/)
  assert.match(conversation, /export \{ useStickToBottomContext \}/)
})

test("Must5 · 单一 virtua；无 tanstack-virtual；用户面无空成功", () => {
  const thread = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-thread.tsx")
  const pkg = read("apps/desktop/package.json")
  const sidebar = read(
    "apps/desktop/src/renderer/src/components/ai-chat/sidebar/sidebar-workspace-row.tsx"
  )
  assert.match(thread, /from ["']virtua["']/)
  assert.doesNotMatch(thread, /@tanstack\/react-virtual/)
  assert.match(pkg, /"virtua"/)
  assert.doesNotMatch(pkg, /@tanstack\/react-virtual/)
  assert.doesNotMatch(sidebar, /from ["']virtua["']|Virtualizer|VList/)
  assert.doesNotMatch(thread, /全面不卡|事件总线已优化|性能大升级/)
})

test("Ban · #212 闲置铬静止不回退（Composer live 闸仍在）", () => {
  const composer = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-composer.tsx")
  assert.match(composer, /active=\{liveAgentWork\}/)
  assert.match(composer, /liveAgentWork\s*=\s*Boolean\(running\s*\|\|\s*pendingApproval\)/)
})
