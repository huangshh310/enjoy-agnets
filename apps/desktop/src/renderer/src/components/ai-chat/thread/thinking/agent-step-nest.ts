/**
 * 把带 parentToolCallId 的步骤挂到父节点下面，顶层只留根。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { AgentStepNode } from "./agent-step-tree.types.ts"

export function nestChildSteps(
  nodes: AgentStepNode[],
  tools: readonly ThreadToolCall[]
): AgentStepNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const childIds = new Set<string>()
  for (const tool of tools) {
    const parentId = tool.parentToolCallId
    if (!parentId) continue
    const parent = byId.get(parentId)
    const child = byId.get(tool.id)
    if (!parent || !child || parent === child) continue
    parent.children = parent.children ?? []
    parent.children.push(child)
    childIds.add(child.id)
  }
  return nodes.filter((node) => !childIds.has(node.id))
}
