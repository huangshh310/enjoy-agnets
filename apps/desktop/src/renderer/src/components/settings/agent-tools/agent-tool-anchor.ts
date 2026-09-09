/**
 * 设置页卡片锚点：能力矩阵点行滚到对应卡；沙箱行切分段。
 */
import { SANDBOX_HARNESS_ID } from "@enjoy-agents/ipc-contract/runtime-capabilities"

export function agentToolCardId(id: string): string {
  return `agent-tool-${id.replace(/[^a-zA-Z0-9:_-]/g, "-")}`
}

export type AgentDocsJump = { kind: "card"; id: string } | { kind: "harness" }

export function resolveAgentDocsJump(id: string): AgentDocsJump {
  if (id === SANDBOX_HARNESS_ID) return { kind: "harness" }
  return { kind: "card", id }
}
