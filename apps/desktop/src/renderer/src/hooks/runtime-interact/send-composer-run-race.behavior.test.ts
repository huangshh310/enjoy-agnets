/**
 * leo MUST 1（#136）：真走 sendComposerMessage → launchComposerRun 调用点。
 * run.error(preOutput) 在 agent.run 返回之前到达：必须走 discarded 分支（不 abort、不 failComposerSend、不删会话）。
 */
import assert from "node:assert/strict"
import { test, afterEach } from "node:test"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const calls: Array<{ path: string; args: unknown[] }> = []
let onRun: (args: any) => any = () => ({ ok: true, runId: "r" })
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: async (_t, _th, args) => {
      calls.push({ path, args })
      if (path === ".agent.run") return onRun(args[0])
      if (path === ".session.messages" || path.endsWith(".list")) return []
      return undefined
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }
const { useChatStore } = await import("../../stores/chat-store.ts")
const { sendComposerMessage } = await import("./send-composer-run.ts")
const { beginNewSessionCreate, finishNewSessionCreate, resetNewSessionCreateForTest } = await import("../new-session-create.ts")
const { resetQueuedComposerSendForTest, cancelQueuedComposerSend } = await import("../queue-composer-send.ts")
const { resetComposerRunningOwnerForTest } = await import("./composer-running-owner.ts")
const { resetDiscardedPreOutputRunsForTest } = await import("../../stores/discarded-pre-output-runs.ts")
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }
const att = (t: string) => ({ text: t, launched: false, cancelled: false, done: false, paused: false }) as never
afterEach(() => { cancelQueuedComposerSend(); resetNewSessionCreateForTest(); resetQueuedComposerSendForTest(); resetComposerRunningOwnerForTest(); resetDiscardedPreOutputRunsForTest(); calls.length = 0 })
const preErr = (runId: string) => useChatStore.getState().applyStreamEvent({ type: "run.error", runId, message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
const paths = () => calls.map((c) => c.path)

test("leo MUST 1（#136）：出字前失败先于 agent.run 返回——红卡仍是 provider_unreachable、输入框留原文、不中止", async () => {
  useChatStore.setState({ workspaceId: "ws", sessionId: "ses_a", running: false, composer: "你好世界", error: null, hasKey: true, modelId: "stub-e2e", messages: [] } as never)
  onRun = () => { preErr("run_a"); return { ok: true, runId: "run_a" } }
  await sendComposerMessage(undefined, "你好世界", att("你好世界"))
  await flush()
  const s = useChatStore.getState()
  assert.equal(s.error, "provider_unreachable")
  assert.equal(s.composer, "你好世界")
  assert.ok(!paths().some((p) => /abort|session\.delete/.test(p)), paths().join(","))
})

test("建会话窗排队首发同样竞态：会话不删、红卡不盖、原文还在", async () => {
  useChatStore.setState({ workspaceId: "ws", sessionId: null, running: false, preparingHint: true, composer: "首发", error: null, hasKey: true, modelId: "stub-e2e", messages: [] } as never)
  onRun = () => { preErr("run_b"); return { ok: true, runId: "run_b" } }
  const { token } = beginNewSessionCreate()
  const p = sendComposerMessage(undefined, "首发", att("首发"))
  useChatStore.setState({ sessionId: "ses_b" } as never)
  finishNewSessionCreate(token, "ses_b")
  await p; await flush()
  const s = useChatStore.getState()
  assert.equal(s.error, "provider_unreachable")
  assert.equal(s.sessionId, "ses_b")
  assert.equal(s.composer, "首发")
  assert.ok(!paths().some((p) => /abort|session\.delete/.test(p)), paths().join(","))
})

test("对照：普通认领失败（未回滚）仍中止孤儿 run 并报发送失败", async () => {
  useChatStore.setState({ workspaceId: "ws", sessionId: "ses_c", running: false, composer: "孤儿", error: null, hasKey: true, modelId: "stub-e2e", messages: [] } as never)
  onRun = () => { useChatStore.setState({ running: false } as never); return { ok: true, runId: "run_c" } }
  await sendComposerMessage(undefined, "孤儿", att("孤儿"))
  await flush()
  const s = useChatStore.getState()
  assert.ok(paths().some((p) => /abort/.test(p)), paths().join(","))
  assert.ok(s.error && s.error !== "provider_unreachable")
})
