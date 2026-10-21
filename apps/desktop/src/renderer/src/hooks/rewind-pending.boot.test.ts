/**
 * #167 leo r4：启动 / 关窗的真实接线（不靠正则）。本文件单独一个进程：
 * - 模块加载**之前**就在 localStorage 里放好上次留下的记录、并把 addEventListener 换成记录器；
 * - 只 import rewind-from-here（它装上 rewind-pending），不手动调任何 ensure / flush；
 * - BOOT：记录自己被并进那个会话的草稿、送到 main、记录删掉（杀 L05：install 里不起轮询）。
 * - PAGEHIDE：派发一个真的 pagehide 事件给装上的监听器（带事件参数），草稿按行合并并送到 main（杀 L04b）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const KEY = "enjoy-agents-pending-rewinds"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}
memory.set(KEY, JSON.stringify({ ses_boot: { text: "please write a note", assets: [{ id: "ast_a", name: "a.png" }] } }))

const listeners: Record<string, Array<(ev: unknown) => void>> = {}
;(globalThis as any).addEventListener = (type: string, fn: (ev: unknown) => void) => void (listeners[type] ??= []).push(fn)
;(globalThis as any).removeEventListener = () => undefined

const saved: Array<{ sessionId: string; text: string }> = []
const savedAssets: Array<{ sessionId: string; assets: Array<{ id: string }> }> = []
const drafts = {
  loadSync: () => ({ ses_boot: "typed" }),
  save: (x: { sessionId: string; text: string }) => void saved.push(x),
  loadAssetsSync: () => ({}),
  saveAssets: (x: { sessionId: string; assets: Array<{ id: string }> }) => void savedAssets.push(x)
}
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : path === ".session" && key === "drafts" ? drafts : bridge(`${path}.${String(key)}`)),
    apply: () => (/\.on[A-Z]\w*$/.test(path) ? () => undefined : Promise.resolve(path.endsWith(".list") ? [] : undefined))
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../stores/chat-store.ts")
useChatStore.setState({ sessionId: null } as never)
const storage = await import("../lib/session-draft-storage.ts")
await import("./rewind-from-here.ts")
const pendingMod = await import("./rewind-pending.ts")

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms))

test("BOOT：上次留下的记录在模块加载时自己放进那个会话的草稿（不用任何操作），送到 main，记录删掉", async () => {
  await tick(300)
  assert.equal(storage.readPersistedDraft("ses_boot"), "typed\nplease write a note")
  assert.ok(saved.some((s) => s.sessionId === "ses_boot" && s.text === "typed\nplease write a note"), "送到了 main")
  assert.ok(savedAssets.some((s) => s.sessionId === "ses_boot" && s.assets.some((a) => a.id === "ast_a")), "图也送到了 main")
  assert.equal(memory.get(KEY) ?? null, null, "记录删了")
})

test("PAGEHIDE：派发真的 pagehide 事件（带事件参数）→ 等待中的原话按行并进前台会话草稿并送到 main；beforeunload 也装了", async () => {
  assert.ok((listeners.pagehide ?? []).length >= 1, "pagehide 装了")
  assert.ok((listeners.beforeunload ?? []).length >= 1, "beforeunload 装了")
  // 前台会话正在组字等写回：输入框里是「我在打字」。
  pendingMod.resetPendingRewindsForTest({ pollMs: 100_000 })
  useChatStore.setState({ sessionId: "ses_fg", composer: "我在打字" } as never)
  const el = { value: "我在打字", getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null) }
  ;(globalThis as any).document = { activeElement: el, querySelector: () => el }
  pendingMod.recordPendingRewind("ses_fg", "please write a note", [{ id: "ast_b", name: "b.png" }])
  saved.length = 0
  for (const fn of listeners.pagehide!) fn({ type: "pagehide", persisted: false })
  assert.equal(storage.readPersistedDraft("ses_fg"), "我在打字\nplease write a note")
  assert.ok(saved.some((s) => s.sessionId === "ses_fg" && s.text === "我在打字\nplease write a note"), "立刻送到 main")
  saved.length = 0
  for (const fn of listeners.beforeunload!) fn({ type: "beforeunload" })
  assert.equal(storage.readPersistedDraft("ses_fg"), "我在打字\nplease write a note", "再来一次不重复")
  pendingMod.resetPendingRewindsForTest(null)
})
