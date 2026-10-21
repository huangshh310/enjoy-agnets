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
  assert.match(src, /restoreComposerAfterFailedSend\(text, SEND_FAILED_RESTORE[^)\n]*\)\s*\n\s*rollbackComposerStartGate\(before\.sessionId\)/)
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

/** 乐观改 workflow 之后、main 接手之前的每个出口都要还原（或交给已还原 / 会还原的路径）。 */
test("发送路径每个出口：乐观改 workflow 之后都还原或确认 main 接手", () => {
  const src = readFileSync(new URL("./send-composer-run.ts", import.meta.url), "utf8")
  const handled = /rollbackComposerStartGate|failComposerSend\(|dropLateCancelledSend\(|commitComposerStartGate/
  const check = (body: string, label: string) => {
    const lines = body.split("\n")
    let exits = 0
    let prev = -1
    lines.forEach((line, i) => {
      if (!/^\s*return\b/.test(line) || /return (Boolean|self|messages)\b/.test(line)) return
      exits++
      // 只看「上一个出口之后」到本出口，别把上一分支的还原算到这一分支头上。
      const window = lines.slice(Math.max(prev + 1, i - 12), i + 1).join("\n")
      prev = i
      assert.match(window, handled, `${label} 第 ${i + 1} 行出口没还原：${line.trim()}`)
    })
    return exits
  }
  const start = src.indexOf("syncReviewGateOnComposerStart(store.sessionId)")
  const end = src.indexOf("function dropLateCancelledSend")
  assert.ok(start > 0 && end > start)
  assert.ok(check(src.slice(start, end), "sendComposer") >= 2)
  const launch = src.slice(src.indexOf("async function launchComposerRun"), src.indexOf("function restoreFromPayload"))
  // NEED_MODEL / failRunBeforePump（main 回 ok:false）、claim 失败、ai.generate / agent.run 抛错、成功
  assert.ok(check(launch, "launchComposerRun") >= 4)
})

test("NEED_MODEL 等被拦（main 回 ok:false）走 failComposerSend：workflow 回 done", () => {
  seed("done")
  gate.syncReviewGateOnComposerStart("ses_e")
  failComposerSend({ text: "x", reason: "NEED_MODEL", sessionId: "ses_e", dropOptimisticUser: true })
  assert.equal(wf(), "done")
})
