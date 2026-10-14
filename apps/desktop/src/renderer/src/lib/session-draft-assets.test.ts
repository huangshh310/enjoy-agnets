import assert from "node:assert/strict"
import { test } from "node:test"

const saved: Array<{ sessionId: string; assets: unknown[] }> = []
let persisted: Record<string, Array<{ id: string; name: string }>> = {}
;(globalThis as { window?: unknown }).window = {
  ide: {
    session: {
      drafts: {
        loadSync: () => ({}),
        save: () => undefined,
        loadAssetsSync: () => persisted,
        saveAssets: (input: { sessionId: string; assets: unknown[] }) => void saved.push(input)
      }
    }
  }
}

const { useChatStore } = await import("../stores/chat-store.ts")
const lib = await import("./session-draft-storage.ts")
const assets = await import("../hooks/composer-assets.ts")

test("jojo P1：用户加图只落当前会话；切会话 / 新建时的整体替换不写库", () => {
  const off = lib.installSessionDraftPersistence()
  useChatStore.setState({ sessionId: "ses_a" })
  assets.queueComposerAsset("ast_a", "a.png", "image/png")
  assert.deepEqual(saved.at(-1), { sessionId: "ses_a", assets: [{ id: "ast_a", name: "a.png", mediaType: "image/png", size: undefined }] })
  const n = saved.length
  useChatStore.setState({ sessionId: "ses_b" })
  assets.clearComposerAssets()
  assets.setComposerAssets([])
  assert.equal(saved.length, n, "切走时的清空不能写成 A（或 B）的空附件")
  off()
})

test("重启后打开会话：草稿附件恢复到它自己的会话，别的会话拿不到", () => {
  persisted = { ses_a: [{ id: "ast_a", name: "a.png" }] }
  lib.resetPersistedDraftAssetsForTest()
  lib.resetPersistedDraftCacheForTest()
  assert.deepEqual(lib.composerDraftForSession("ses_a")?.assets?.map((x: { id: string }) => x.id), ["ast_a"])
  assert.equal(lib.composerDraftForSession("ses_b"), undefined)
})

test("leo：发送被 main 接手后清本会话附件缓存——切走再切回，旧图不冒回输入框", async () => {
  const { readFileSync } = await import("node:fs")
  lib.resetPersistedDraftAssetsForTest()
  persisted = {}
  useChatStore.setState({ sessionId: "ses_send" })
  lib.writePersistedDraftAssets("ses_send", [{ id: "ast_s", name: "s.png" }])
  lib.writePersistedDraftAssets("ses_other", [{ id: "ast_o", name: "o.png" }])
  assert.ok(lib.composerDraftForSession("ses_send")?.assets?.length)
  lib.forgetPersistedDraftAssets("ses_send")
  assert.equal(lib.composerDraftForSession("ses_send"), undefined)
  assert.deepEqual(lib.readPersistedDraftAssets("ses_other")?.map((a) => a.id), ["ast_o"], "别的会话不动")
  const src = readFileSync(new URL("../hooks/runtime-interact/send-composer-run.ts", import.meta.url), "utf8")
  assert.match(src, /commitComposerStartGate\(sessionId\)\s*\n\s*forgetPersistedDraftAssets\(sessionId\)/)
  // 发送 catch 用发送时的会话，不读当前界面会话
  const catchBody = src.slice(src.indexOf('traceSend("send:throw"'), src.indexOf("} finally {", src.indexOf('traceSend("send:throw"')))
  assert.match(catchBody, /sessionId: draftSid/)
  assert.doesNotMatch(catchBody, /useChatStore\.getState\(\)\.sessionId/)
})

test("leo：建会话窗里粘的图，会话建好立刻落到该会话草稿", async () => {
  const { readFileSync } = await import("node:fs")
  lib.resetPersistedDraftAssetsForTest()
  persisted = {}
  assets.clearComposerAssets()
  useChatStore.setState({ sessionId: null })
  assets.queueComposerAsset("ast_c", "c.png", "image/png")
  lib.persistCreateWindowAssets("ses_new")
  assert.deepEqual(saved.at(-1)?.sessionId, "ses_new")
  assert.deepEqual(lib.readPersistedDraftAssets("ses_new")?.map((a) => a.id), ["ast_c"])
  const src = readFileSync(new URL("../hooks/session-lifecycle.ts", import.meta.url), "utf8")
  const publish = readFileSync(new URL("../hooks/create-window-composer.ts", import.meta.url), "utf8")
  // jojo P1（#155 gate2）：有排队首发也要落——框里留着的图是下一条的，不并进 A（会话建好时走 publishCreatedComposer）。
  assert.match(src, /publishCreatedComposer\(session\.id\)/)
  assert.match(publish, /persistCreateWindowAssets\(sessionId\)/)
  assert.doesNotMatch(src, /absorbAssetsIntoQueuedSend/)
  assets.clearComposerAssets()
})

test("luna：内存草稿里已被 revoke 的 blob 预览不带回；按 id 从资产库重读", async () => {
  const { readFileSync } = await import("node:fs")
  useChatStore.getState().saveSessionDraft("ses_blob", {
    text: "",
    assets: [
      { id: "ast_b", name: "F.png", mediaType: "image/png", url: "blob:file:///dead" },
      { id: "ast_k", name: "K.png", mediaType: "image/png", url: "data:image/png;base64,AA" }
    ]
  })
  const draft = lib.composerDraftForSession("ses_blob")
  assert.deepEqual(
    draft?.assets?.map((a: { id: string; url?: string }) => [a.id, a.url]),
    [["ast_b", undefined], ["ast_k", "data:image/png;base64,AA"]]
  )
  const chip = readFileSync(new URL("../components/ai-chat/composer-queue-items.tsx", import.meta.url), "utf8")
  assert.match(chip, /onError=\{\(\) => setSrc\(\(cur\) => \(cur\?\.startsWith\("blob:"\) \? null : cur\)\)\}/)
})
