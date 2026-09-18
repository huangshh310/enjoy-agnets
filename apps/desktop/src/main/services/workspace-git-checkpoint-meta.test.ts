import assert from "node:assert/strict"
import { test } from "node:test"
import { pickTurnBaseline } from "@enjoy-agents/ipc-contract/workspace-io"
import {
  formatCheckpointSubject,
  parseCheckpointSubject
} from "./workspace-git-checkpoint-meta.ts"

test("无 meta 或非法 token 仍是旧 subject", () => {
  assert.equal(formatCheckpointSubject(), "enjoy checkpoint")
  assert.equal(
    formatCheckpointSubject({ sessionId: "sess x", runId: "run_1", kind: "baseline" }),
    "enjoy checkpoint"
  )
})

test("编解码 session / run / kind", () => {
  const subject = formatCheckpointSubject({
    sessionId: "sess_abc",
    runId: "run_def",
    kind: "baseline"
  })
  assert.equal(subject, "enjoy checkpoint session=sess_abc run=run_def kind=baseline")
  assert.deepEqual(parseCheckpointSubject(subject), {
    sessionId: "sess_abc",
    runId: "run_def",
    kind: "baseline"
  })
  assert.deepEqual(parseCheckpointSubject("enjoy checkpoint"), {})
})

test("挑该用户句时间窗里最早的 baseline", () => {
  const picked = pickTurnBaseline(
    [
      { sessionId: "s1", kind: "baseline", createdAt: 30 },
      { sessionId: "s1", kind: "turn", createdAt: 20 },
      { sessionId: "s1", kind: "baseline", createdAt: 15 },
      { sessionId: "s2", kind: "baseline", createdAt: 16 }
    ],
    { sessionId: "s1", from: 10, until: 25 }
  )
  assert.equal(picked?.createdAt, 15)
})
