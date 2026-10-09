import assert from "node:assert/strict"
import { test } from "node:test"
import {
  APPROVAL_ARGS_MISMATCH,
  APPROVAL_REPLAY_DENIED,
  APPROVAL_ARGS_MISMATCH_COPY,
  isToolNotExecuted
} from "./approval-not-executed.ts"

test("未执行：deny 态、回放码、参数不一致、resumeCode 都算", () => {
  assert.equal(isToolNotExecuted({ state: "output-denied" }), true)
  assert.equal(
    isToolNotExecuted({
      state: "output-error",
      result: { code: APPROVAL_REPLAY_DENIED },
      errorText: "本次未执行。"
    }),
    true
  )
  assert.equal(
    isToolNotExecuted({
      state: "output-error",
      result: { code: APPROVAL_ARGS_MISMATCH },
      errorText: APPROVAL_ARGS_MISMATCH_COPY
    }),
    true
  )
  assert.equal(
    isToolNotExecuted({
      state: "output-error",
      result: { code: "stale_observation", resumeCode: "stale_observation" }
    }),
    true
  )
  assert.equal(isToolNotExecuted({ state: "output-available" }), false)
  assert.equal(isToolNotExecuted({ state: "output-error", errorText: "Explore mode is read-only." }), false)
})
