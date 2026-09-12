/**
 * 连续 ≥2 条顶层子智能体的结构边框列表。内部不再套第二根竖线。
 * 花名册内 Blobatar 种子名去重。不是 Workflow DAG，也不是侧栏会话。
 */
import type { ReactNode } from "react"
import type { AgentStepNode } from "../agent-step-tree.types"
import { personasForSubagents } from "../subagent-persona"
import { SubagentRow } from "./subagent-row"

export function SubagentRoster({
  node,
  renderItemTree
}: {
  node: AgentStepNode
  renderItemTree: (item: AgentStepNode) => ReactNode
}) {
  const items = node.rosterItems ?? []
  const personas = personasForSubagents(items)
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border-button-default px-2 py-1">
      {items.map((item, index) => (
        <SubagentRow
          key={item.id}
          node={item}
          persona={personas[index]}
          tree={renderItemTree(item)}
        />
      ))}
    </div>
  )
}
