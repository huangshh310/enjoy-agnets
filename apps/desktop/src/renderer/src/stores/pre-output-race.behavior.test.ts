/**
 * leo MUST 1（#136）：出字前失败先于 agent.run 返回——回滚 → 认领 runId，顺序固定：
 * 必须判成 discarded（不中止、不盖红卡），而不是 orphan。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { useChatStore } = await import("./chat-store.ts")
const { settleLaunchedRun } = await import("../hooks/runtime-interact/settle-launched-run.ts")
const { resetDiscardedPreOutputRunsForTest } = await import("./discarded-pre-output-runs.ts")

test("run.error(preOutput) 先到并回滚，随后 agent.run 返回同一 runId：settle=discarded，红卡保留", () => {
  resetDiscardedPreOutputRunsForTest()
  useChatStore.setState({
    sessionId: "ses_r",
    runId: null,
    running: true,
    composer: "",
    error: null,
    messages: [
      { id: "u", role: "user", content: "hello", createdAt: 1 },
      { id: "a", role: "assistant", content: "", createdAt: 2, streaming: true }
    ]
  } as never)
  useChatStore.getState().applyStreamEvent({
    type: "run.error",
    runId: "run_r",
    message: "provider_unreachable",
    code: "provider_unreachable",
    preOutput: true
  } as never)
  const afterRollback = useChatStore.getState()
  assert.equal(afterRollback.running, false)
  assert.equal(afterRollback.messages.length, 0)
  const card = afterRollback.error

  let claimed = 0
  const outcome = settleLaunchedRun("ses_r", "run_r", () => {
    claimed += 1
    return false
  })
  assert.equal(outcome, "discarded")
  assert.equal(claimed, 0, "不走认领 → 不会 abortOrphanedRun / failComposerSend")
  assert.equal(useChatStore.getState().error, card, "红卡不被盖")
})

test("没被回滚的 run 照常认领；认领失败才是 orphan", () => {
  resetDiscardedPreOutputRunsForTest()
  assert.equal(settleLaunchedRun("s", "run_ok", () => true), "claimed")
  assert.equal(settleLaunchedRun("s", "run_x", () => false), "orphan")
})
