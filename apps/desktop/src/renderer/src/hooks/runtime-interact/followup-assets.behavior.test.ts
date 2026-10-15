/**
 * jojo / leo #155 BLOCK：排队项的图跟着排队项走，且任何失败都不丢用户内容。
 * - 入队（submitComposer）：草稿附件打排队标记，不删；输入框 / 切回不认（不冒只图草稿）。
 * - × 删：图随项丢。退回：图回草稿。马上发成功：图进纠偏、标记摘掉。
 * - 马上发失败：原样放回队首（字 + 图），草稿标记还在。
 * - ACP 运行中：带图不纠偏，留在队列 + 可见提示。
 * - 重启（队列没了）：带标记的图连同字退回草稿，不悄悄丢。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

let dbAssets: Record<string, Array<Record<string, unknown>>> = {}
let steerImpl: (input: { text: string; attachments?: string[] }) => Promise<unknown> = async () => ({ ok: true })
const steers: Array<{ text: string; attachments?: string[] }> = []
;(globalThis as { window?: unknown }).window = {
  ide: {
    session: {
      drafts: {
        loadSync: () => ({}),
        save: () => undefined,
        loadAssetsSync: () => JSON.parse(JSON.stringify(dbAssets)),
        saveAssets: (input: { sessionId: string; assets: Array<Record<string, unknown>> }) => {
          if (input.assets.length) dbAssets[input.sessionId] = input.assets
          else delete dbAssets[input.sessionId]
        }
      }
    },
    agent: {
      steer: async (input: { text: string; attachments?: string[] }) => {
        steers.push(input)
        return steerImpl(input)
      }
    }
  }
}

const { useChatStore } = await import("../../stores/chat-store.ts")
const storage = await import("../../lib/session-draft-storage.ts")
const assets = await import("../composer-assets.ts")
const queue = await import("../followup-queue.ts")
const actions = await import("./followup-actions.ts")
const { submitComposer } = await import("../send-composer.ts")

const off = storage.installSessionDraftPersistence()

function reset() {
  dbAssets = {}
  storage.resetPersistedDraftAssetsForTest()
  for (const item of queue.listFollowups()) queue.removeFollowup(item.id)
  assets.clearComposerAssets()
  steerImpl = async () => ({ ok: true })
}

/** 运行中贴图 + 打字 + Enter：走 submitComposer 的排队分支。 */
async function queueWithImage(sessionId: string, runtimeId = "enjoy-local") {
  reset()
  useChatStore.setState({ sessionId, running: true, runId: `run_${sessionId}`, runtimeId, composer: "", messages: [], error: null } as never)
  assets.queueComposerAsset("ast_q", "q.png", "image/png")
  useChatStore.getState().setComposer("看这张")
  await submitComposer()
  const [item] = queue.listFollowups(sessionId)
  assert.ok(item, "进了队列")
  assert.deepEqual(item.assets.map((a) => a.id), ["ast_q"])
  return item
}

const rows = (sid: string) => (dbAssets[sid] ?? []) as Array<{ id: string; queued?: { itemId: string; text: string } }>

test("入队：草稿附件打排队标记不删；输入框和切回都不认（不冒只图草稿）", async () => {
  const item = await queueWithImage("ses_q1")
  assert.deepEqual(rows("ses_q1").map((r) => [r.id, r.queued?.itemId]), [["ast_q", item.id]])
  assert.equal(storage.readPersistedDraftAssets("ses_q1"), undefined)
  assert.equal(assets.listComposerAssets().length, 0)
  assert.equal(storage.composerDraftForSession("ses_q1")?.assets, undefined)
})

test("× 删排队项：图随项丢，库里不留", async () => {
  const item = await queueWithImage("ses_q2")
  actions.discardFollowup(item)
  assert.deepEqual(rows("ses_q2"), [])
  assert.equal(storage.composerDraftForSession("ses_q2"), undefined)
})

test("leo MUST 1：马上发（纠偏）失败——原样放回队首，字和图都在，草稿标记还在", async () => {
  const item = await queueWithImage("ses_q3")
  steerImpl = async () => {
    throw new Error("ASSET_READ_FAILED")
  }
  await actions.sendFollowupNow(item)
  const back = queue.listFollowups("ses_q3")
  assert.equal(back.length, 1)
  assert.equal(back[0]!.id, item.id)
  assert.equal(back[0]!.prompt, item.prompt)
  assert.deepEqual(back[0]!.assets.map((a) => a.id), ["ast_q"])
  assert.deepEqual(rows("ses_q3").map((r) => r.queued?.itemId), [item.id])
})

test("马上发成功：图随纠偏进当前 run，气泡带图，标记摘掉，正在打的字不动", async () => {
  const item = await queueWithImage("ses_q4")
  useChatStore.getState().setComposer("正在打的字")
  await actions.sendFollowupNow(item)
  assert.deepEqual(steers.at(-1)?.attachments, ["ast_q"])
  assert.deepEqual(useChatStore.getState().messages.at(-1)?.assets?.map((a) => a.assetId), ["ast_q"])
  assert.equal(useChatStore.getState().composer, "正在打的字")
  assert.equal(queue.listFollowups("ses_q4").length, 0)
  assert.deepEqual(rows("ses_q4"), [])
})

test("leo MUST 2：ACP 运行中带图不纠偏——留在队列 + 可见提示，不调 agent.steer", async () => {
  const item = await queueWithImage("ses_q5", "claude")
  const before = steers.length
  await actions.sendFollowupNow(item)
  assert.equal(steers.length, before)
  assert.equal(queue.listFollowups("ses_q5")[0]?.id, item.id)
  assert.equal(queue.getRuntimeHint("ses_q5"), "imageSteerQueued")
})

test("主线决定：非 ACP、模型看不了图——agent.steer 回「收不了图」：这条带图原样留在队首、锁定提示，不弹红卡", async () => {
  const item = await queueWithImage("ses_q6", "enjoy-local")
  const second = queue.enqueueFollowup({ sessionId: "ses_q6", prompt: "第二条", assets: [] })
  queue.setRuntimeHint(null, null)
  steerImpl = async () => {
    // Electron 包一层：main 抛的 STEER_IMAGES_UNSUPPORTED 前面带上 invoke 前缀。
    throw new Error("Error invoking remote method 'agent.steer': Error: STEER_IMAGES_UNSUPPORTED")
  }
  await actions.sendFollowupNow(item)
  const back = queue.listFollowups("ses_q6")
  assert.deepEqual(back.map((row) => row.id), [item.id, second.id], "带图这条回到队首，排在第二条前面")
  assert.deepEqual(back[0]!.assets.map((a) => a.id), ["ast_q"])
  assert.deepEqual(rows("ses_q6").map((r) => r.queued?.itemId), [item.id], "草稿排队标记还在")
  assert.equal(queue.getRuntimeHint(), "imageSteerQueued")
  assert.equal(useChatStore.getState().error, null, "不弹原始报错红卡")
})

test("退回输入框：图回草稿（普通行，不再带排队标记）", async () => {
  const item = await queueWithImage("ses_q6")
  actions.returnFollowupToComposer(item)
  assert.deepEqual(rows("ses_q6").map((r) => [r.id, r.queued]), [["ast_q", undefined]])
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), ["ast_q"])
})

test("重启后队列没了：带标记的图连同那条字退回草稿，不悄悄丢", async () => {
  await queueWithImage("ses_q7")
  for (const item of queue.listFollowups()) queue.removeFollowup(item.id) // 模拟进程重启：内存队列清空
  storage.resetPersistedDraftAssetsForTest()
  useChatStore.setState({ sessionDrafts: {} } as never)
  const draft = storage.composerDraftForSession("ses_q7")
  assert.equal(draft?.text, "看这张")
  assert.deepEqual(draft?.assets?.map((a: { id: string }) => a.id), ["ast_q"])
  assert.equal(rows("ses_q7")[0]?.queued, undefined, "库里也改回普通草稿")
})

test.after(() => off())
