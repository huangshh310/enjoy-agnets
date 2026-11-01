/**
 * kai send-p2 A（jojo 巡检 211e3bbb / #163）：运行中贴图 + Ctrl+Enter 插话——
 * 图要跟着进当前 run；收不了图就整条老实排到下一轮，绝不出「已收到」。
 * 真走 submitComposer / chat-store，只假 IPC 桥（window.ide）和输入框 DOM。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { STEER_IMAGES_UNSUPPORTED } from "@enjoy-agents/ipc-contract/quoted-context"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}

let dbAssets: Record<string, Array<Record<string, unknown>>> = {}
const steers: Array<{ sessionId: string; text: string; attachments?: string[] }> = []
let steerImpl: (input: { sessionId: string; text: string; attachments?: string[] }) => unknown = () => ({ ok: true })
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      if (path === ".session.drafts.loadSync") return {}
      if (path === ".session.drafts.loadAssetsSync") return JSON.parse(JSON.stringify(dbAssets))
      if (path === ".session.drafts.saveAssets") {
        const input = args[0] as { sessionId: string; assets: Array<Record<string, unknown>> }
        if (input.assets.length) dbAssets[input.sessionId] = input.assets
        else delete dbAssets[input.sessionId]
        return undefined
      }
      return (async () => {
        if (path === ".agent.steer") {
          const input = args[0] as { sessionId: string; text: string; attachments?: string[] }
          steers.push(input)
          const result = await steerImpl(input)
          // 真 main：落库事务里顺手清掉这几张图的草稿附件。
          const ids = new Set(input.attachments ?? [])
          if (ids.size) {
            const rest = (dbAssets[input.sessionId] ?? []).filter((a) => !ids.has(String(a.id)))
            if (rest.length) dbAssets[input.sessionId] = rest
            else delete dbAssets[input.sessionId]
          }
          return result
        }
        if (path === ".session.messages" || path.endsWith(".list")) return []
        return undefined
      })()
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

let dom = ""
const el = {
  get value() {
    return dom
  },
  set value(next: string) {
    dom = next
  },
  getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null)
}
;(globalThis as any).document = { activeElement: el, querySelector: () => el }

const { useChatStore } = await import("../../stores/chat-store.ts")
const { submitComposer } = await import("../send-composer.ts")
const fq = await import("../followup-queue.ts")
const assets = await import("../composer-assets.ts")
const storage = await import("../../lib/session-draft-storage.ts")
const { hintLabel } = await import("../../components/ai-chat/composer/runtime-interact/runtime-hint-label.ts")
const { zh: zhCatalog } = await import("../../i18n/catalogs/zh/index.ts")
const { en: enCatalog } = await import("../../i18n/catalogs/en/index.ts")
const { translate } = await import("../../i18n/lookup.ts")
const tZh = (path: string, vars?: Record<string, string | number>) => translate(zhCatalog, path, vars)
const tEn = (path: string, vars?: Record<string, string | number>) => translate(enCatalog, path, vars)

storage.installSessionDraftPersistence()

function userTypes(text: string) {
  dom = text
  useChatStore.getState().setComposer(text)
}

afterEach(() => {
  fq.resetFollowupsForTest()
  assets.clearComposerAssets()
  storage.resetPersistedDraftAssetsForTest()
  storage.resetPersistedDraftCacheForTest()
  memory.clear()
  dbAssets = {}
  steers.length = 0
  steerImpl = () => ({ ok: true })
  dom = ""
})

const IMG = { id: "ast_orange", name: "orange.png", mediaType: "image/png" }
const IMG2 = { id: "ast_blue", name: "blue.png", mediaType: "image/png" }
const rows = (sid: string) => (dbAssets[sid] ?? []) as Array<{ id: string; queued?: { itemId: string } }>

/** 「very slow 插图测试」跑着；输入框贴图（落草稿附件）+ 打字。 */
function runningWithImageDraft(sessionId: string, text: string, runtimeId = "enjoy-local") {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: true,
    runId: `run_${sessionId}`,
    runtimeId,
    composer: "",
    error: null,
    messages: [{ id: "u0", role: "user", content: "very slow 插图测试", createdAt: 1 }]
  } as never)
  assets.queueComposerAsset({ ...IMG })
  userTypes(text)
  assert.deepEqual(rows(sessionId).map((r) => r.id), [IMG.id], "前提：图已落草稿附件")
}

test("A：Ctrl+Enter 插话带图——图随 agent.steer 进当前 run，气泡带图，托盘 / 草稿附件清空，才提示已收到", async () => {
  runningWithImageDraft("ses_a1", "顺便看这张橙色图")
  await submitComposer("steer")
  assert.equal(steers.length, 1)
  assert.deepEqual(steers[0]!.attachments, [IMG.id], "图跟着插话一起交给当前 run")
  const last = useChatStore.getState().messages.at(-1)!
  assert.equal(last.role, "user")
  assert.equal(last.content, "顺便看这张橙色图")
  assert.deepEqual(last.assets?.map((a) => a.assetId), [IMG.id], "气泡带图")
  assert.deepEqual(assets.listComposerAssets(), [], "托盘清空")
  assert.equal(useChatStore.getState().composer, "")
  assert.equal(storage.readPersistedDraftAssets("ses_a1"), undefined, "草稿附件（含 renderer 缓存）不再挂着这张图")
  assert.equal(fq.getRuntimeHint(), "steered")
})

test("A：运行中收不了图（STEER_IMAGES_UNSUPPORTED）——字和图整条排到下一轮，提示说排队，不说已收到", async () => {
  runningWithImageDraft("ses_a2", "顺便看这张橙色图", "claude")
  steerImpl = () => {
    throw new Error(STEER_IMAGES_UNSUPPORTED)
  }
  await submitComposer("steer")
  assert.equal(steers.length, 1)
  const [item, ...more] = fq.listFollowups("ses_a2")
  assert.ok(item, "整条进了队列")
  assert.equal(more.length, 0)
  assert.equal(item.prompt, "顺便看这张橙色图")
  assert.deepEqual(item.assets.map((a) => a.id), [IMG.id], "图跟着这条排队，没被扣在托盘")
  assert.deepEqual(rows("ses_a2").map((r) => [r.id, r.queued?.itemId]), [[IMG.id, item.id]], "草稿附件改打排队标记")
  assert.deepEqual(assets.listComposerAssets(), [])
  assert.equal(useChatStore.getState().composer, "", "输入框清空（这条在队列里）")
  assert.equal(fq.getRuntimeHint(), "imageSteerQueued", "提示：运行中收不了图，排到下一轮")
  assert.equal(fq.runtimeHintImageCount(), 1, "提示按 1 张图选单数")
  assert.equal(hintLabel(fq.getRuntimeHint(), tEn, "", fq.runtimeHintImageCount()), "It can't take images while running, so this message and its image will be sent next turn.")
  assert.equal(hintLabel(fq.getRuntimeHint(), tZh, "", fq.runtimeHintImageCount()), "它运行中收不了图，这条连图一起排到下一轮发。")
  assert.equal(useChatStore.getState().messages.at(-1)?.content, "very slow 插图测试", "没有冒充已发出的气泡")
})

test("A：收不了图、托盘里 2 张——整条带 2 张排队，en 提示用复数", async () => {
  runningWithImageDraft("ses_a2b", "两张一起看", "claude")
  assets.queueComposerAsset({ ...IMG2 })
  steerImpl = () => {
    throw new Error(STEER_IMAGES_UNSUPPORTED)
  }
  await submitComposer("steer")
  const [item] = fq.listFollowups("ses_a2b")
  assert.deepEqual(item?.assets.map((a) => a.id), [IMG.id, IMG2.id])
  assert.equal(fq.runtimeHintImageCount(), 2)
  assert.equal(hintLabel(fq.getRuntimeHint(), tEn, "", fq.runtimeHintImageCount()), "It can't take images while running, so this message and its images will be sent next turn.")
  assert.equal(hintLabel(fq.getRuntimeHint(), tZh, "", fq.runtimeHintImageCount()), "它运行中收不了图，这条连图一起排到下一轮发。")
})

test("A：插话失败——图回托盘、字留在输入框，不提示已收到", async () => {
  runningWithImageDraft("ses_a3", "顺便看这张橙色图")
  steerImpl = () => {
    throw new Error("ASSET_READ_FAILED")
  }
  await submitComposer("steer")
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), [IMG.id], "图回托盘")
  assert.equal(useChatStore.getState().composer, "顺便看这张橙色图")
  assert.notEqual(fq.getRuntimeHint(), "steered")
  assert.equal(fq.listFollowups("ses_a3").length, 0)
  assert.deepEqual(rows("ses_a3").map((r) => r.id), [IMG.id], "草稿附件还在")
})

test("A：main 已没有活 run（仍在收尾）——字和图进排队，图打排队标记，提示排队", async () => {
  runningWithImageDraft("ses_a4", "顺便看这张橙色图")
  steerImpl = () => {
    throw new Error("STEER_NO_ACTIVE_RUN")
  }
  await submitComposer("steer")
  const [item] = fq.listFollowups("ses_a4")
  assert.ok(item)
  assert.deepEqual(item.assets.map((a) => a.id), [IMG.id])
  assert.deepEqual(rows("ses_a4").map((r) => [r.id, r.queued?.itemId]), [[IMG.id, item.id]])
  assert.equal(storage.composerDraftForSession("ses_a4")?.assets, undefined, "切回不冒只图草稿")
  assert.deepEqual(assets.listComposerAssets(), [])
  assert.equal(fq.getRuntimeHint(), "queued")
})

test("A 对照：纯文字插话不变——不带 attachments，提示已收到", async () => {
  useChatStore.setState({ workspaceId: "ws", sessionId: "ses_a5", running: true, runId: "run_a5", runtimeId: "enjoy-local", composer: "", error: null, messages: [] } as never)
  userTypes("换个思路")
  await submitComposer("steer")
  assert.equal(steers.length, 1)
  assert.equal(steers[0]!.attachments, undefined)
  assert.equal(fq.getRuntimeHint(), "steered")
})
