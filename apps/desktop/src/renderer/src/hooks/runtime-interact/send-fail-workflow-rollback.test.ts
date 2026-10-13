/**
 * jojo P2：已通过（done）的会话发送后看门狗失败 / main 没接手：workflow 还原为 done，侧栏不蓝圈，改动条不重现。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const { useChatStore } = await import("../../stores/chat-store.ts")
const gate = await import("../../components/ai-chat/review-gate/sync-review-gate.ts")
const { failComposerSend } = await import("./fail-composer-send.ts")
const { sessionReviewVisible } = await import(
  "../../components/ai-chat/composer/session-review/session-review-visible.ts"
)

const wf = () => useChatStore.getState().repositories.find((n) => n.id === "ses_e")?.workflowStatus ?? null

function seed(status: "done" | "needs_review" | null) {
  gate.resetComposerStartGatesForTest()
  useChatStore.setState({
    sessionId: "ses_e",
    repositories: [{ id: "ses_e", workflowStatus: status } as never]
  })
}

test("已通过 → 发送 → main 接手前失败：workflow 回 done，改动条隐藏", () => {
  seed("done")
  gate.syncReviewGateOnComposerStart("ses_e")
  assert.equal(wf(), "in_progress", "发送时乐观标执行中（侧栏蓝圈）")
  failComposerSend({ text: "x", reason: "SEND_FAILED_RESTORE", sessionId: "ses_e" })
  assert.equal(wf(), "done")
  // 改动条：approved 且未运行 → 不显示
  assert.equal(sessionReviewVisible(1, false, null, "a.txt", 2, false, wf() === "done"), false)
})

test("看门狗失败路径也还原（不经 failComposerSend）", () => {
  seed("done")
  gate.syncReviewGateOnComposerStart("ses_e")
  gate.rollbackComposerStartGate("ses_e")
  assert.equal(wf(), "done")
  const src = readFileSync(new URL("./send-composer-run.ts", import.meta.url), "utf8")
  assert.match(src, /restoreComposerAfterFailedSend\(text, SEND_FAILED_RESTORE\)\s*\n\s*rollbackComposerStartGate\(before\.sessionId\)/)
})

test("之后有更新的改动 / main 已接手：不还原", () => {
  seed("done")
  gate.syncReviewGateOnComposerStart("ses_e")
  useChatStore.getState().patchSessionNode("ses_e", { workflowStatus: "needs_review" })
  gate.rollbackComposerStartGate("ses_e")
  assert.equal(wf(), "needs_review")
  seed("done")
  gate.syncReviewGateOnComposerStart("ses_e")
  gate.commitComposerStartGate("ses_e")
  failComposerSend({ text: "x", reason: "SEND_FAILED_RESTORE", sessionId: "ses_e" })
  assert.equal(wf(), "in_progress")
})
