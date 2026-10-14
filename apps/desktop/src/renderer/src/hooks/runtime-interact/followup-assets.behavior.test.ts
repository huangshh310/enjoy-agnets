/**
 * jojo #155 BLOCK：排队项的图跟着排队项走——发送 / 马上发 / 删除 / 退回输入框，都不留在草稿附件里。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const savedAssets: Array<{ sessionId: string; assets: Array<{ id: string }> }> = []
const steers: Array<{ text: string; attachments?: string[] }> = []
;(globalThis as { window?: unknown }).window = {
  ide: {
    session: {
      drafts: {
        loadSync: () => ({}),
        save: () => undefined,
        loadAssetsSync: () => ({}),
        saveAssets: (input: { sessionId: string; assets: Array<{ id: string }> }) => void savedAssets.push(input)
      }
    },
    agent: {
      steer: async (input: { text: string; attachments?: string[] }) => {
        steers.push(input)
        return { ok: true }
      }
    }
  }
}

const { useChatStore } = await import("../../stores/chat-store.ts")
const storage = await import("../../lib/session-draft-storage.ts")
const assets = await import("../composer-assets.ts")
const queue = await import("../followup-queue.ts")
const actions = await import("./followup-actions.ts")

function lastDraftAssets(sessionId: string): string[] {
  const row = [...savedAssets].reverse().find((s) => s.sessionId === sessionId)
  return row?.assets.map((a) => a.id) ?? []
}

function queueWithImage(sessionId: string) {
  useChatStore.setState({ sessionId, composer: "" } as never)
  assets.queueComposerAsset("ast_q", "q.png", "image/png")
  assert.deepEqual(lastDraftAssets(sessionId), ["ast_q"], "前提：贴图先落草稿")
  const taken = assets.takeComposerAssetsForQueue()
  return queue.enqueueFollowup({ sessionId, prompt: "看这张", draft: "看这张", assets: taken })
}

const off = storage.installSessionDraftPersistence()

test("入队：图从草稿附件移到排队项（× 删掉 / 切回都不会冒回来）", () => {
  const item = queueWithImage("ses_q1")
  assert.deepEqual(lastDraftAssets("ses_q1"), [], "草稿附件已清")
  assert.equal(storage.readPersistedDraftAssets("ses_q1"), undefined)
  assert.deepEqual(item.assets.map((a) => a.id), ["ast_q"])
  queue.removeFollowup(item.id)
  assert.equal(storage.composerDraftForSession("ses_q1"), undefined, "× 后切回没有只图草稿")
})

test("运行中「马上发给它」：图随纠偏进当前 run，输入框正在打的字不动", async () => {
  const item = queueWithImage("ses_q2")
  useChatStore.setState({ running: true, runId: "run_q2", composer: "正在打的字", messages: [] } as never)
  await actions.sendFollowupNow(item)
  assert.deepEqual(steers.at(-1)?.attachments, ["ast_q"])
  const bubble = useChatStore.getState().messages.at(-1)
  assert.deepEqual(bubble?.assets?.map((a) => a.assetId), ["ast_q"], "气泡带图")
  assert.equal(useChatStore.getState().composer, "正在打的字")
  assert.equal(storage.readPersistedDraftAssets("ses_q2"), undefined)
  useChatStore.setState({ running: false, runId: null } as never)
})

test("退回输入框：图回到这个会话的草稿", () => {
  const item = queueWithImage("ses_q3")
  actions.returnFollowupToComposer(item)
  assert.deepEqual(lastDraftAssets("ses_q3"), ["ast_q"])
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), ["ast_q"])
  assets.clearComposerAssets()
})

test.after(() => off())
