import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  clearComposerAssets,
  listComposerAssets,
  queueComposerAsset
} from "./composer-assets.ts"
import {
  beginNewSessionCreate,
  failNewSessionCreate,
  finishNewSessionCreate,
  resetNewSessionCreateForTest
} from "./new-session-create.ts"
import {
  mergeComposerText,
  remainingComposerAfterSend,
  cancelQueuedComposerSend,
  hasQueuedComposerSend,
  resetQueuedComposerSendForTest,
  SEND_FAILED_RESTORE,
  SESSION_CREATE_TIMEOUT,
  sendFailureCopy,
  waitThenSendAfterCreate
} from "./queue-composer-send.ts"

function resetQueue() {
  resetNewSessionCreateForTest()
  resetQueuedComposerSendForTest()
  clearComposerAssets()
}

test("创建窗内发送：等 create 回来再发，失败还文", async () => {
  resetQueue()
  const { token } = beginNewSessionCreate()
  const sent: string[] = []
  const pending = waitThenSendAfterCreate(
    "hello",
    async (prepared) => {
      sent.push(prepared.content)
    },
    undefined,
    { readSessionId: () => "ses_1" }
  )
  assert.deepEqual(sent, [])
  finishNewSessionCreate(token, "ses_1")
  await pending
  assert.deepEqual(sent, ["hello"])
})

test("创建失败：不发、还文码", async () => {
  resetQueue()
  const { token } = beginNewSessionCreate()
  let called = false
  let restored = ""
  const pending = waitThenSendAfterCreate(
    "still here",
    async () => {
      called = true
    },
    undefined,
    { onFail: (text) => { restored = text } }
  )
  failNewSessionCreate(token, new Error("boom"))
  await pending
  assert.equal(called, false)
  assert.equal(restored, "still here")
  assert.equal(sendFailureCopy(new Error("SESSION_CREATE_TIMEOUT")), SESSION_CREATE_TIMEOUT)
  assert.equal(sendFailureCopy(new Error("boom")), SEND_FAILED_RESTORE)
})

test("入队时带上附件，create 回来一并交给 prepared", async () => {
  resetQueue()
  const { token } = beginNewSessionCreate()
  const sent: Array<{ content: string; assetIds: string[] }> = []
  const pending = waitThenSendAfterCreate(
    "read this",
    async (prepared) => {
      sent.push({ content: prepared.content, assetIds: prepared.assets?.map((item) => item.id) ?? [] })
    },
    [{ id: "ast_note", name: "note.txt", mediaType: "text/plain" }],
    { readSessionId: () => "ses_1" }
  )
  finishNewSessionCreate(token, "ses_1")
  await pending
  assert.deepEqual(sent, [{ content: "read this", assetIds: ["ast_note"] }])
})

test("二次 Enter 用最新正文替换队列", async () => {
  resetQueue()
  const { token } = beginNewSessionCreate()
  const sent: string[] = []
  const deps = { readSessionId: () => "ses_1" }
  const first = waitThenSendAfterCreate("hello", async (prepared) => {
    sent.push(prepared.content)
  }, undefined, deps)
  const second = waitThenSendAfterCreate("hello edited", async (prepared) => {
    sent.push(prepared.content)
  }, undefined, deps)
  finishNewSessionCreate(token, "ses_1")
  await Promise.all([first, second])
  assert.deepEqual(sent, ["hello edited"])
})

test("前台 sessionId 对不上 create 返回的 id：不发、还文", async () => {
  resetQueue()
  const { token } = beginNewSessionCreate()
  let called = false
  let restored = ""
  const pending = waitThenSendAfterCreate(
    "hello",
    async () => {
      called = true
    },
    undefined,
    {
      readSessionId: () => "ses_other",
      onFail: (text) => { restored = text }
    }
  )
  finishNewSessionCreate(token, "ses_1")
  await pending
  assert.equal(called, false)
  assert.equal(restored, "hello")
})

test("失败还文与创建窗内已键入合并，不覆盖", () => {
  assert.equal(mergeComposerText("hello", "hello more"), "hello more")
  assert.equal(mergeComposerText("hello", ""), "hello")
  assert.equal(mergeComposerText("hello", "other"), "other\nhello")
})

test("失败还文时把入队附件交给 onFail", async () => {
  resetQueue()
  const { token } = beginNewSessionCreate()
  let failedAssets: string[] = []
  const pending = waitThenSendAfterCreate(
    "read this",
    async () => {
      throw new Error("no")
    },
    [{ id: "ast_note", name: "note.txt" }],
    { onFail: (_text, _reason, assets) => { failedAssets = assets?.map((item) => item.id) ?? [] } }
  )
  failNewSessionCreate(token, new Error("boom"))
  await pending
  assert.deepEqual(failedAssets, ["ast_note"])
})

test("取消队列后 create 完成不得再发", async () => {
  resetQueue()
  const { token } = beginNewSessionCreate()
  const sent: string[] = []
  const pending = waitThenSendAfterCreate(
    "partial",
    async (prepared) => {
      sent.push(prepared.content)
    },
    undefined,
    { readSessionId: () => "ses_1" }
  )
  cancelQueuedComposerSend()
  assert.equal(hasQueuedComposerSend(), false)
  finishNewSessionCreate(token, "ses_1")
  await pending
  assert.deepEqual(sent, [])
})

test("成功只清已发出的正文", () => {
  assert.equal(remainingComposerAfterSend("hello", "hello extra"), "extra")
  assert.equal(remainingComposerAfterSend("hello", "hello"), "")
  assert.equal(remainingComposerAfterSend("hello", "other"), "other")
  assert.equal(remainingComposerAfterSend("hello world again", "he"), "")
})

test("queue-composer-send 再导出 QueuedComposerAsset", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "queue-composer-send.ts"), "utf8")
  assert.match(src, /export type \{ QueuedComposerAsset \}/)
})

test("未 take 的附件也能入队", async () => {
  resetQueue()
  queueComposerAsset({ id: "ast_late", name: "late.txt" })
  const { token } = beginNewSessionCreate()
  const sent: string[] = []
  const pending = waitThenSendAfterCreate(
    "hello",
    async (prepared) => {
      sent.push(prepared.assets?.[0]?.id ?? "")
    },
    undefined,
    { readSessionId: () => "ses_1" }
  )
  finishNewSessionCreate(token, "ses_1")
  await pending
  assert.deepEqual(sent, ["ast_late"])
  assert.deepEqual(listComposerAssets(), [])
})
