/**
 * jojo ④：「正在准备…」（running 已占位、run 还没发出）时又来一发——不得静默丢：还稿 + 可见提示。
 */
import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"

const { useChatStore } = await import("../../stores/chat-store.ts")
const { sendComposerMessage } = await import("./send-composer-run.ts")
const { PREVIOUS_STILL_PREPARING, SEND_FAILED_RESTORE } = await import("../queue-composer-send-copy.ts")
const { listComposerAssets, setComposerAssets } = await import("../composer-assets.ts")

beforeEach(() => {
  setComposerAssets([])
  useChatStore.setState({
    sessionId: "ses_prep",
    running: true,
    preparingHint: true,
    composer: "",
    error: null,
    messages: [{ id: "u1", role: "user", content: "第一句", createdAt: 1 }]
  })
})

test("排队续发撞上 running：原文与附件还回输入框并出提示", async () => {
  await sendComposerMessage({
    content: "第二句",
    assets: [{ id: "asset_q", name: "q.png", mediaType: "image/png" } as never]
  })
  const state = useChatStore.getState()
  assert.equal(state.composer, "第二句")
  assert.equal(state.error, PREVIOUS_STILL_PREPARING)
  assert.deepEqual(listComposerAssets().map((item) => item.id), ["asset_q"])
  // 不动正在准备的第一发
  assert.equal(state.running, true)
})

test("Enter 原文撞上 running：留稿出提示，不静默", async () => {
  await sendComposerMessage(undefined, "第三句")
  assert.equal(useChatStore.getState().composer, "第三句")
  assert.equal(useChatStore.getState().error, PREVIOUS_STILL_PREPARING)
})

test("不在准备、只是别的轮在跑：仍是「没发出去，已放回」", async () => {
  useChatStore.setState({ preparingHint: false })
  await sendComposerMessage({ content: "第四句" })
  assert.equal(useChatStore.getState().composer, "第四句")
  assert.equal(useChatStore.getState().error, SEND_FAILED_RESTORE)
})

test("文案：zh/en 都有「上一条还在准备」", async () => {
  const zh = (await import("../../i18n/catalogs/zh/chat.ts")) as Record<string, Record<string, string>>
  const en = (await import("../../i18n/catalogs/en/chat.ts")) as Record<string, Record<string, string>>
  const pick = (mod: Record<string, Record<string, string>>) =>
    Object.values(mod).find((v) => v && typeof v === "object" && "previousStillPreparing" in v)!.previousStillPreparing
  assert.match(pick(zh), /上一条还在准备/)
  assert.match(pick(en), /still being prepared/)
})
