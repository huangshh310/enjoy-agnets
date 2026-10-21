/**
 * leo #164 S5：停止时的 abort IPC 失败不再静默吞掉——记一条 ABORT_IPC_FAILED 日志（main 那边这一轮可能还在跑）。
 * 界面照旧立刻停，不等 IPC。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
let abortImpl: (runId: string) => Promise<unknown> = () => Promise.resolve({ ok: true })
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _this, args) => {
      if (path === ".ai.abort") return abortImpl(args[0])
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      return Promise.resolve(path.endsWith(".list") ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge(""), matchMedia: () => ({ matches: true }) }
const { useChatStore } = await import("../stores/chat-store.ts")
const { abortComposerRun } = await import("./composer-run-control.ts")

async function stopWith(impl: typeof abortImpl) {
  abortImpl = impl
  const warns: unknown[][] = []
  const orig = console.warn
  console.warn = (...args: unknown[]) => void warns.push(args)
  try {
    useChatStore.setState({ workspaceId: "ws", sessionId: "ses_A", running: true, runId: "run_a", messages: [], pendingStreamEvents: [], pendingApproval: null } as never)
    await abortComposerRun()
    assert.equal(useChatStore.getState().running, false, "界面立刻停")
    await new Promise((r) => setTimeout(r, 0))
  } finally {
    console.warn = orig
  }
  return warns
}

test("abort IPC 失败：记 ABORT_IPC_FAILED（带 runId），不抛给调用方", async () => {
  const warns = await stopWith(() => Promise.reject(new Error("ipc gone")))
  const hit = warns.find((w) => w[0] === "[run] ABORT_IPC_FAILED")
  assert.ok(hit, JSON.stringify(warns))
  assert.equal(hit![1], "run_a")
})

test("abort IPC 成功：不记日志", async () => {
  const warns = await stopWith(() => Promise.resolve({ ok: true }))
  assert.equal(warns.filter((w) => w[0] === "[run] ABORT_IPC_FAILED").length, 0)
})
