/**
 * leo（#155 条件过）必修 1：真跑 renderer submitComposer / failComposerSend（真 store、真排队、真附件仓），
 * 桩掉 window.ide 记 IPC。回退 send-composer.ts:35-42 或 fail-composer-send.ts 空会话判定，这些必挂。
 */
import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"

const calls: Array<{ path: string; args: unknown[] }> = []
function bridge(path: string): unknown {
  return new Proxy(() => undefined, {
    get: (_t, key) => bridge(`${path}.${String(key)}`),
    apply: async (_t, _this, args) => {
      calls.push({ path, args })
      return { ok: true }
    }
  })
}
;(globalThis as { window?: unknown }).window = { ide: bridge("") }

const { useChatStore } = await import("../../renderer/src/stores/chat-store.ts")
const { submitComposer } = await import("../../renderer/src/hooks/send-composer.ts")
const { setComposerAssets, clearComposerAssets, listComposerAssets } = await import("../../renderer/src/hooks/composer-assets.ts")
const { addQuotedContext, setQuotedContexts } = await import("../../renderer/src/hooks/quoted-context.ts")
const { listFollowups, takeNextFollowup } = await import("../../renderer/src/hooks/followup-queue.ts")
const { composerHasChips } = await import("../../renderer/src/hooks/composer-draft-extras.ts")
const { failComposerSend } = await import("../../renderer/src/hooks/runtime-interact/fail-composer-send.ts")

const SID = "ses_submit_img"
const IMG = { id: "asset_img_1", name: "a.png", mediaType: "image/png", size: 10, url: "blob:x" }

beforeEach(() => {
  calls.length = 0
  clearComposerAssets()
  setQuotedContexts([])
  while (takeNextFollowup(SID)) {}
  useChatStore.setState({ sessionId: SID, workspaceId: "ws", running: true, composer: "", error: null, messages: [] } as never)
})

const steerCalls = () => calls.filter((c) => /steer/i.test(c.path))

test("运行中只带图「纠偏」：改走排队，图随队列走，不调 steer、不静默丢", async () => {
  setComposerAssets([IMG] as never)
  await submitComposer("steer")
  const queued = listFollowups(SID)
  assert.equal(queued.length, 1, "只图纠偏必须进队列")
  assert.deepEqual(queued[0]!.assets?.map((a: { id: string }) => a.id), [IMG.id])
  assert.equal(steerCalls().length, 0)
  assert.equal(listComposerAssets().length, 0, "入队后输入框附件清掉")
})

test("运行中只有引用 Chip 排队：Chip 拼进正文，能入队", async () => {
  addQuotedContext({ id: "q1", type: "text", title: "引用", content: "被引用的话" } as never)
  await submitComposer("queue")
  assert.equal(listFollowups(SID).length, 1, "只有 Chip 也该入队")
})

test("hasChips 不把附件算进去", () => {
  setComposerAssets([IMG] as never)
  assert.equal(composerHasChips(), false)
  addQuotedContext({ id: "q2", type: "text", title: "引用" } as never)
  assert.equal(composerHasChips(), true)
})

test("运行中空稿排队：什么都没有就不入队", async () => {
  await submitComposer("queue")
  assert.equal(listFollowups(SID).length, 0)
})

test("新建会话里只图那轮发送失败：会话里有只图用户句 → 不删会话（只图也算内容）", async () => {
  useChatStore.setState({
    running: false,
    messages: [{ id: "u_img", role: "user", content: "", assets: [{ id: IMG.id }], createdAt: 1 }]
  } as never)
  failComposerSend({ text: "", reason: "boom", sessionId: SID, createdSessionId: SID })
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(calls.filter((c) => c.path === ".session.delete").length, 0)
})

test("对照：新建会话真空（没有任何内容）发送失败 → 删会话", async () => {
  useChatStore.setState({ running: false, messages: [] } as never)
  failComposerSend({ text: "", reason: "boom", sessionId: SID, createdSessionId: SID })
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(calls.filter((c) => c.path === ".session.delete").length, 1)
})
