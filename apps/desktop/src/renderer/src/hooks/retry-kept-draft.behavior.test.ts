/**
 * jojo P2（#136 r4 产品决定）：「再发一次」只重发被留下的那一句（字 + 它自己的附件），恰好一条消息；
 * 输入框里新打的字 / 新贴的图是下一条草稿：不自动另发、不并进重发、不清掉。
 * 真走 retryKeptDraft → sendComposerMessage → agent.run。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const runs: any[] = []
const calls: string[] = []
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      calls.push(path)
      // 订阅类（onEvent 等）同步返回退订函数。
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      return answer(path, args)
    }
  })
}
async function answer(path: string, args: any[]): Promise<any> {
  {
      if (path === ".agent.run") {
        runs.push(args[0])
        return { ok: true, runId: `run_retry_${runs.length}` }
      }
      if (path === ".session.messages" || path.endsWith(".list")) return []
      return undefined
  }
}
;(globalThis as any).window = { ide: bridge("") }
const { useChatStore } = await import("../stores/chat-store.ts")
const { retryKeptDraft } = await import("./retry-kept-draft.ts")
const { retryKeptDraftPlan, composerWithoutKept } = await import("./retry-kept-draft-plan.ts")
const assets = await import("./composer-assets.ts")
const { resetQueuedComposerSendForTest, cancelQueuedComposerSend } = await import("./queue-composer-send.ts")
const { resetComposerRunningOwnerForTest } = await import("./runtime-interact/composer-running-owner.ts")
const { resetDiscardedPreOutputRunsForTest } = await import("../stores/discarded-pre-output-runs.ts")
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }
afterEach(() => {
  cancelQueuedComposerSend()
  resetQueuedComposerSendForTest()
  resetComposerRunningOwnerForTest()
  resetDiscardedPreOutputRunsForTest()
  assets.clearComposerAssets()
  runs.length = 0
  calls.length = 0
})

/** 发出「看看这张图」+ ast_kept，出字前失败回滚：字和图回输入框。 */
function rolledBackTurn(sessionId: string) {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: true,
    runId: `run_${sessionId}`,
    composer: "",
    error: null,
    hasKey: true,
    modelId: "stub-e2e",
    pendingStreamEvents: [],
    messages: [
      { id: "u1", role: "user", content: "看看这张图", createdAt: 1, assets: [{ assetId: "ast_kept", mediaType: "image/png", name: "kept.png" }] },
      { id: "a1", role: "assistant", content: "", createdAt: 2, streaming: true }
    ]
  } as never)
  useChatStore.getState().applyStreamEvent({ type: "run.error", runId: `run_${sessionId}`, message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
  assert.equal(useChatStore.getState().composer, "看看这张图")
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), ["ast_kept"])
}

const runText = (input: any) => String(((input?.messages ?? []) as any[]).filter((m) => m.role === "user").at(-1)?.content ?? "")
const runAttachments = (input: any) => (input?.attachments ?? []) as string[]

test("jojo P2：回滚后又打了字、贴了新图 → 再发一次只发那一句 + 它自己的图；新字新图原样留在输入框", async () => {
  rolledBackTurn("ses_retry")
  // 用户接着写下一条：新字 + 新图。
  useChatStore.getState().setComposer("看看这张图\n下一条草稿")
  assets.queueComposerAsset("ast_new", "new.png", "image/png")

  retryKeptDraft()
  await flush()

  assert.equal(runs.length, 1, "恰好一条消息")
  assert.match(runText(runs[0]), /看看这张图/)
  assert.doesNotMatch(runText(runs[0]), /下一条草稿/, "新字不并进重发")
  assert.deepEqual(runAttachments(runs[0]), ["ast_kept"], "只带它自己的图，不带新图")
  const userBubbles = useChatStore.getState().messages.filter((m) => m.role === "user")
  assert.equal(userBubbles.length, 1)
  assert.equal(userBubbles[0]!.content, "看看这张图")
  assert.deepEqual(userBubbles[0]!.assets?.map((a) => a.assetId), ["ast_kept"])
  assert.equal(useChatStore.getState().composer, "下一条草稿", "新字留在输入框")
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), ["ast_new"], "新图留在输入框")
})

test("jojo P2：只贴了新图（没打字）→ 同样只重发那一句，新图不被当成一条发出去", async () => {
  rolledBackTurn("ses_retry2")
  assets.queueComposerAsset("ast_new2", "new2.png", "image/png")
  retryKeptDraft()
  await flush()
  assert.equal(runs.length, 1)
  assert.deepEqual(runAttachments(runs[0]), ["ast_kept"])
  assert.equal(useChatStore.getState().composer, "")
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), ["ast_new2"])
})

test("判定：记着那一句 → resend-kept；用户句还在线程（keptUserMessage）→ retry-turn，输入框新图不抢；闸拦（无快照）才发输入框", () => {
  assert.equal(retryKeptDraftPlan({ kept: { text: "", assetCount: 1 }, lastUserPending: false, composer: "新字", composerAssetCount: 1 }), "resend-kept")
  assert.equal(retryKeptDraftPlan({ kept: null, lastUserPending: true, composer: "", composerAssetCount: 1 }), "retry-turn")
  assert.equal(retryKeptDraftPlan({ kept: null, lastUserPending: false, composer: "", composerAssetCount: 1 }), "send")
  assert.equal(retryKeptDraftPlan({ kept: null, lastUserPending: false, composer: " ", composerAssetCount: 0 }), "none")
  assert.equal(composerWithoutKept("补的字\n看看这张图\n再补", "看看这张图"), "补的字\n再补")
  assert.equal(composerWithoutKept("看看这张图", "看看这张图"), "")
  assert.equal(composerWithoutKept("改过了", "看看这张图"), "改过了")
})
