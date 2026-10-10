/**
 * Deny → 继续 / 重开已拒绝线程：ThinkingTrace 同步调用 parseAgentStepNodes。
 * 合入时若丢了 formatToolName 的 import，这里会抛 ReferenceError，整窗白屏。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  APPROVAL_REPLAY_DENIED,
  APPROVAL_REPLAY_DENIED_COPY
} from "@enjoy-agents/ipc-contract/approval-not-executed"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"
import { threadFromRows } from "../../../../hooks/hydrate-thread.ts"
import { parseAgentStepNodes } from "./agent-step-tree-parser.ts"

const mockT: TranslateFn = (key) => key

function deniedDesktopAct(state: ThreadToolCall["state"]): ThreadToolCall {
  return {
    id: "tool_deny",
    name: "desktop_act",
    args: { action: "click", appName: "备忘录", elementName: "今日" },
    state,
    result: { code: APPROVAL_REPLAY_DENIED },
    errorText: APPROVAL_REPLAY_DENIED_COPY
  }
}

test("拒绝后继续：desktop_act deny 必须 parse 出 denied，不得抛未定义标识符", () => {
  const tool = deniedDesktopAct("output-denied")
  assert.doesNotThrow(() => parseAgentStepNodes("", [tool], mockT))
  const nodes = parseAgentStepNodes("", [tool], mockT)
  assert.equal(nodes.length, 1)
  assert.equal(nodes[0]?.status, "denied")
  assert.equal(nodes[0]?.title, "desktop act")
  assert.ok((nodes[0]?.errorText ?? "").length > 0)
})

test("重开已拒绝线程：库里 output-error + 拒绝码仍能 parse，不是转圈也不是白屏", () => {
  const content = JSON.stringify({
    v: 1,
    content: "",
    tools: [deniedDesktopAct("output-error")]
  })
  const [message] = threadFromRows([
    { id: "msg_denied", role: "assistant", content, createdAt: 1 }
  ])
  const tools = message?.tools ?? []
  assert.equal(tools[0]?.state, "output-error")
  assert.doesNotThrow(() => parseAgentStepNodes("", tools, mockT))
  const nodes = parseAgentStepNodes("", tools, mockT)
  assert.equal(nodes.length, 1)
  assert.equal(nodes[0]?.status, "denied")
  assert.equal(nodes[0]?.title, "desktop act")
  assert.notEqual(nodes[0]?.status, "running")
})
