/**
 * leo r3 M4：发出后马上切走，出字前失败在后台回滚。main 已把正文写回 session_drafts、图并回 session_draft_assets；
 * renderer 的正文缓存 / 附件缓存 / 内存草稿必须重读合并，切回能看到稿和图，之后整行替换的 saveAssets 不丢图。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { beforeEach, test } from "node:test"

type DraftAsset = { id: string; name: string; mediaType?: string; size?: number; queued?: { itemId: string; text: string } }
const main = {
  text: {} as Record<string, string>,
  assets: {} as Record<string, DraftAsset[]>,
  saves: [] as Array<{ sessionId: string; text: string }>
}
;(globalThis as { window?: unknown }).window = {
  ide: {
    session: {
      drafts: {
        loadSync: () => ({ ...main.text }),
        save: (input: { sessionId: string; text: string }) => {
          main.saves.push(input)
          if (input.text.trim()) main.text[input.sessionId] = input.text
          else delete main.text[input.sessionId]
        },
        loadAssetsSync: () => JSON.parse(JSON.stringify(main.assets)),
        saveAssets: (input: { sessionId: string; assets: DraftAsset[] }) => {
          if (input.assets.length) main.assets[input.sessionId] = input.assets
          else delete main.assets[input.sessionId]
        }
      }
    }
  }
}

const { useChatStore } = await import("../stores/chat-store.ts")
const storage = await import("./session-draft-storage.ts")

beforeEach(() => {
  main.text = {}
  main.assets = {}
  main.saves = []
  storage.resetPersistedDraftCacheForTest()
  storage.resetPersistedDraftAssetsForTest()
  useChatStore.setState({ sessionId: "ses_B", sessionDrafts: {} } as never)
})

function sendThenSwitchAway(sessionId: string, typedBeforeLeaving = "") {
  // 发送时：缓存里本会话无稿，发出清稿挂了「空稿」保持；claim 后 forget 了附件缓存。
  storage.readPersistedDraft(sessionId)
  storage.readPersistedDraftAssets(sessionId)
  storage.holdEmptyDraftWrite(sessionId)
  storage.releaseEmptyDraftHold(sessionId, true)
  storage.forgetPersistedDraftAssets(sessionId)
  // 切到 B：A 的内存草稿是发出后的空样子（或切走前又补的字）。
  useChatStore.getState().saveSessionDraft(sessionId, { text: typedBeforeLeaving, assets: [] })
}

function mainRollsBack(sessionId: string, text: string, assets: DraftAsset[]) {
  main.text[sessionId] = text
  main.assets[sessionId] = assets
}

test("后台回滚：切回 A 能看到还回的字和图；防抖中的空稿不再把它删掉", () => {
  sendThenSwitchAway("ses_A")
  mainRollsBack("ses_A", "后台发出去的那句", [{ id: "ast_a", name: "a.png", mediaType: "image/png" }])
  assert.equal(storage.noteBackgroundRunError("ses_A", { type: "run.error", preOutput: true }), true)
  const draft = storage.composerDraftForSession("ses_A")
  assert.equal(draft?.text, "后台发出去的那句")
  assert.deepEqual(draft?.assets?.map((a: DraftAsset) => a.id), ["ast_a"])
  storage.flushPersistedDrafts()
  assert.equal(main.text.ses_A, "后台发出去的那句", "空稿没落 main 删掉还回的稿")
  assert.ok(!main.saves.some((s) => s.sessionId === "ses_A" && s.text === ""))
})

test("后台回滚后再加一张图（整行替换 saveAssets）：还回的图仍在", () => {
  sendThenSwitchAway("ses_A")
  mainRollsBack("ses_A", "带图那句", [{ id: "ast_a", name: "a.png" }])
  storage.noteBackgroundRunError("ses_A", { type: "run.error", preOutput: true })
  const cached = storage.readPersistedDraftAssets("ses_A") ?? []
  storage.writePersistedDraftAssets("ses_A", [...cached, { id: "ast_new", name: "new.png" }])
  assert.deepEqual(main.assets.ses_A?.map((a) => a.id), ["ast_a", "ast_new"])
})

test("leo r4 B1：A 带图发出、出字前又贴 B 图排队后切走，A 后台回滚：草稿只有 A 的图，B 的图留在排队标记里", () => {
  sendThenSwitchAway("ses_A")
  // 出字前贴 B 图 + Enter：入队，草稿附件打排队标记（整行写 main）。
  storage.markDraftAssetsQueued("ses_A", "follow_B", "B", [{ id: "ast_q", name: "q.png", mediaType: "image/png" }])
  // main 回滚事务把 A 的图并回同一整行（排队行原样在前）。
  mainRollsBack("ses_A", "A 那句", [...(main.assets.ses_A ?? []), { id: "ast_a", name: "a.png", mediaType: "image/png" }])
  storage.noteBackgroundRunError("ses_A", { type: "run.error", preOutput: true })

  assert.deepEqual(storage.composerDraftForSession("ses_A")?.assets?.map((a: DraftAsset) => a.id), ["ast_a"], "切回只有 A 的图")
  assert.deepEqual(storage.readPersistedDraftAssets("ses_A")?.map((a) => a.id), ["ast_a"])
  assert.deepEqual(
    useChatStore.getState().getSessionDraft("ses_A")?.assets?.map((a: { id: string }) => a.id),
    ["ast_a"],
    "内存草稿不带排队项的图"
  )
  // 之后一次整行替换（再贴一张）：排队标记不丢。
  storage.writePersistedDraftAssets("ses_A", [...(storage.readPersistedDraftAssets("ses_A") ?? []), { id: "ast_new", name: "n.png" }])
  assert.deepEqual(
    main.assets.ses_A?.map((a) => [a.id, a.queued?.itemId ?? null]),
    [["ast_a", null], ["ast_new", null], ["ast_q", "follow_B"]]
  )
  // 删掉排队项：B 的图随项走，不留在草稿里。
  storage.releaseQueuedDraftAssets("ses_A", "follow_B")
  assert.deepEqual(main.assets.ses_A?.map((a) => a.id), ["ast_a", "ast_new"])
  assert.deepEqual(storage.readPersistedDraftAssets("ses_A")?.map((a) => a.id), ["ast_a", "ast_new"])
})

test("切走前又补了字：与还回的稿合并并写回 main", () => {
  sendThenSwitchAway("ses_A", "切走前补的字")
  mainRollsBack("ses_A", "后台发出去的那句", [])
  storage.noteBackgroundRunError("ses_A", { type: "run.error", preOutput: true })
  assert.equal(storage.composerDraftForSession("ses_A")?.text, "切走前补的字\n后台发出去的那句")
  storage.flushPersistedDrafts()
  assert.equal(main.text.ses_A, "切走前补的字\n后台发出去的那句")
})

test("只认后台出字前回滚：普通 run.error / 保留用户句（keptUserMessage）不重读", () => {
  assert.equal(storage.noteBackgroundRunError("ses_A", { type: "run.error", preOutput: false }), false)
  assert.equal(storage.noteBackgroundRunError("ses_A", { type: "run.error", preOutput: true, keptUserMessage: true }), false)
  assert.equal(storage.noteBackgroundRunError(undefined, { type: "run.error", preOutput: true }), false)
  assert.equal(storage.noteBackgroundRunError("ses_A", { type: "run.end" }), false)
})

test("接线：dispatchAgentEvent 停车分支调 noteBackgroundRunError", () => {
  const src = readFileSync(new URL("../stores/attention/dispatch-agent-event.ts", import.meta.url), "utf8")
  const park = src.indexOf("applyParkEvent(sessionId, event)")
  const note = src.indexOf("noteBackgroundRunError(sessionId, event)")
  assert.ok(park > 0 && note > park)
})
