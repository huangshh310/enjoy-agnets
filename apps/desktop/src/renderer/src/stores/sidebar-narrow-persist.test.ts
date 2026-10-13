import { test } from "node:test"
import assert from "node:assert/strict"

test("窄窗自动收起不写偏好；手动开关才写（leo #151）", async () => {
  const writes: Array<[string, string]> = []
  const mem = new Map<string, string>()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => (writes.push([k, v]), mem.set(k, v)),
    removeItem: (k: string) => mem.delete(k)
  }
  try {
    const { useChatStore } = await import("./chat-store.ts")
    useChatStore.getState().setSidebarNarrow(true)
    assert.equal(useChatStore.getState().sidebarCollapsed, true)
    assert.deepEqual(writes.filter(([k]) => k === "enjoy.sidebarCollapsed"), [])
    useChatStore.getState().setSidebarNarrow(false)
    assert.equal(useChatStore.getState().sidebarCollapsed, false)
    assert.deepEqual(writes.filter(([k]) => k === "enjoy.sidebarCollapsed"), [])
    useChatStore.getState().setSidebarCollapsed(true)
    assert.deepEqual(writes.filter(([k]) => k === "enjoy.sidebarCollapsed"), [["enjoy.sidebarCollapsed", "1"]])
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage
  }
})
