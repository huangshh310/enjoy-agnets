import assert from "node:assert/strict"
import { test } from "node:test"
import { foldToolEvent } from "@enjoy-agents/ipc-contract"
import { zh } from "../../../i18n/catalogs/zh/index.ts"
import { translate } from "../../../i18n/lookup.ts"
import { mapToolStatus } from "./thinking/extract-step-fields.ts"
import { isDeniedTool, toolDeniedCopy } from "./tool-denied-copy.ts"

const t = (path: string) => translate(zh, path)

test("拒绝后是已拒绝态，不是出错", () => {
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
  assert.equal(mapToolStatus("output-denied"), "completed")
  assert.equal(toolDeniedCopy(t), "已拒绝，本次未执行")
})
