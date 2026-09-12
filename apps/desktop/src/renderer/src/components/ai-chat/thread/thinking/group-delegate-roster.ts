/**
 * 连续顶层 delegate ≥2 收成花名册。
 * 不复用 isBatch：批量是摘要计数（运行 N 条命令），花名册必须露出每一行。
 * 只收顶层 sibling；已 nest 的 children 不重收。
 * 不是 Workflow DAG，也不是侧栏会话。
 */
import type { AgentStepNode } from "./agent-step-tree.types.ts"

const ROSTER_MIN = 2

export function groupDelegateRoster(nodes: AgentStepNode[]): AgentStepNode[] {
  const result: AgentStepNode[] = []
  let index = 0
  while (index < nodes.length) {
    const node = nodes[index]!
    if (node.kind !== "delegate" || node.isRoster) {
      result.push(node)
      index += 1
      continue
    }
    const run = takeDelegateRun(nodes, index)
    if (run.length < ROSTER_MIN) {
      result.push(node)
      index += 1
      continue
    }
    result.push(toRosterNode(run))
    index += run.length
  }
  return result
}

function takeDelegateRun(nodes: AgentStepNode[], start: number): AgentStepNode[] {
  let end = start
  while (end < nodes.length) {
    const node = nodes[end]
    if (!node || node.kind !== "delegate" || node.isRoster) break
    end += 1
  }
  return nodes.slice(start, end)
}

function toRosterNode(run: AgentStepNode[]): AgentStepNode {
  return {
    id: `roster_${run[0]!.id}`,
    kind: "delegate",
    title: "",
    status: rosterStatus(run),
    isRoster: true,
    rosterItems: run
  }
}

function rosterStatus(run: AgentStepNode[]): AgentStepNode["status"] {
  if (run.some((node) => node.status === "error")) return "error"
  if (run.some((node) => node.status === "running")) return "running"
  if (run.every((node) => node.status === "pending")) return "pending"
  return "completed"
}
