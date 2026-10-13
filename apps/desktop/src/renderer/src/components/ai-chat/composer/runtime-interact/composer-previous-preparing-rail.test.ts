/**
 * leo soft：灰条的 setError(null)——✕ 与准备好自动收起都只收「上一条还在准备」。
 */
import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"

const { useChatStore } = await import("../../../../stores/chat-store.ts")
const { PREVIOUS_STILL_PREPARING, SEND_FAILED_RESTORE } = await import("../../../../lib/usage/classify-thread-error.ts")
const { autoDismissComposerRailNotice, dismissComposerRailNotice } = await import(
  "./composer-rail-notice.ts"
)

beforeEach(() => useChatStore.setState({ error: PREVIOUS_STILL_PREPARING }))

test("✕：清掉灰条", () => {
  dismissComposerRailNotice()
  assert.equal(useChatStore.getState().error, null)
})

test("✕：别的错误（红卡）不动", () => {
  useChatStore.setState({ error: SEND_FAILED_RESTORE })
  dismissComposerRailNotice()
  assert.equal(useChatStore.getState().error, SEND_FAILED_RESTORE)
})

test("准备提示由亮转灭：自动收起；仍在准备 / 本来没在准备都不动", () => {
  assert.equal(autoDismissComposerRailNotice(true, true), false)
  assert.equal(useChatStore.getState().error, PREVIOUS_STILL_PREPARING)
  assert.equal(autoDismissComposerRailNotice(false, false), false)
  assert.equal(useChatStore.getState().error, PREVIOUS_STILL_PREPARING)
  assert.equal(autoDismissComposerRailNotice(true, false), true)
  assert.equal(useChatStore.getState().error, null)
})

test("准备好时是红卡：不自动清", () => {
  useChatStore.setState({ error: SEND_FAILED_RESTORE })
  assert.equal(autoDismissComposerRailNotice(true, false), false)
  assert.equal(useChatStore.getState().error, SEND_FAILED_RESTORE)
})
