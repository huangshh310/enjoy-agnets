import assert from "node:assert/strict"
import { test } from "node:test"
import { foldToolEvent } from "@enjoy-agents/ipc-contract"
import {
  APPROVAL_ARGS_MISMATCH,
  APPROVAL_ARGS_MISMATCH_COPY,
  APPROVAL_REPLAY_DENIED,
  isToolNotExecuted
} from "@enjoy-agents/ipc-contract/approval-not-executed"
import { zh } from "../../../i18n/catalogs/zh/index.ts"
import { translate } from "../../../i18n/lookup.ts"
import { mapToolStatus } from "./thinking/extract-step-fields.ts"
import { isDeniedTool, toolDeniedCopy } from "./tool-denied-copy.ts"

const t = (path: string) => translate(zh, path)

test("拒绝后是已拒绝态，不是完成也不是出错", () => {
  const tools: Parameters<typeof foldToolEvent>[0] = []
  foldToolEvent(tools, {
    type: "approval.required",
    runId: "run_1",
    toolCallId: "tool_1",
    approvalId: "apr_1",
    name: "desktop_act",
    args: {}
  })
  foldToolEvent(tools, {
    type: "approval.resolved",
    runId: "run_1",
    toolCallId: "tool_1",
    decision: "deny"
  })
  assert.equal(tools[0]?.state, "output-denied")
  assert.equal(isDeniedTool(tools[0]), true)
  assert.equal(mapToolStatus("output-denied", tools[0]), "denied")
  assert.equal(toolDeniedCopy(t), "已拒绝，本次未执行")
})

test("fail closed / 参数不一致也走未执行，不计入已运行", () => {
  const replay = {
    id: "tool_replay",
    name: "desktop_act",
    state: "output-error" as const,
    result: { code: APPROVAL_REPLAY_DENIED },
    errorText: "本次未执行。"
  }
  const mismatch = {
    id: "tool_mismatch",
    name: "desktop_act",
    state: "output-error" as const,
    result: { code: APPROVAL_ARGS_MISMATCH },
    errorText: APPROVAL_ARGS_MISMATCH_COPY
  }
  assert.equal(isDeniedTool(replay), true)
  assert.equal(isToolNotExecuted(replay), true)
  assert.equal(mapToolStatus(replay.state, replay), "denied")
  assert.equal(mapToolStatus(mismatch.state, mismatch), "denied")
  assert.equal(toolDeniedCopy(t, mismatch), "审批参数已变化，本次未执行。")
  const executed = [replay, mismatch].filter((tool) => !isToolNotExecuted(tool))
  assert.equal(executed.length, 0)
})
