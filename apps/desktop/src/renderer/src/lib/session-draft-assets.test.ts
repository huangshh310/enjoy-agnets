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
