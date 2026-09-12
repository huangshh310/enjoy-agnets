/**
 * Agent Step Tree：思考与工具同一导轨。按步骤切开，不堆整段 reasoning。
 */
import { cx } from "@/utils/cx"
import type { AgentStepNode } from "./agent-step-tree.types"
import { BatchEditingGroupRow } from "./step-tree/batch-group-row"
import { ThinkingNodeBranch } from "./step-tree/thinking-branch"
import { StepGlyph } from "./step-tree/step-glyph"
import { SubagentRoster } from "./step-tree/subagent-roster"
import { SubagentRow } from "./step-tree/subagent-row"
import { ToolStepNodeRow } from "./step-tree/tool-step-row"

export function AgentStepTree({
  nodes,
  className,
  compact = false
}: {
  nodes: AgentStepNode[]
  className?: string
  compact?: boolean
}) {
  if (nodes.length === 0) return null
  const hasTools = nodes.some((n) => n.kind !== "thinking")

  return (
    <div
      className={cx(
        "relative flex flex-col select-none",
        compact ? "gap-0.5 py-0.5" : "gap-2.5 py-1 pl-1",
        className
      )}
    >
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1
        return (
          <div key={node.id} className={cx("relative flex items-start", compact ? "gap-1.5" : "gap-2.5")}>
            {!compact && !isLast ? (
              <span className="absolute bottom-[-10px] left-1.75 top-5 w-px bg-border-button-default/70" aria-hidden />
            ) : null}
            <div
              className={cx(
                "relative z-10 mt-0.5 flex items-center justify-center",
                compact ? "size-3.5" : "size-4 rounded-full bg-background-primary-default"
              )}
            >
              <StepGlyph kind={node.kind} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <StepNodeBody node={node} hasTools={hasTools} compact={compact} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function nestedTree(nodes?: AgentStepNode[], compact = false) {
  if (!nodes?.length) return undefined
  return <AgentStepTree nodes={nodes} className={compact ? undefined : "pl-1"} compact={compact} />
}

function StepNodeBody({
  node,
  hasTools,
  compact
}: {
  node: AgentStepNode
  hasTools: boolean
  compact: boolean
}) {
  if (node.kind === "thinking" && node.rawText) {
    return (
      <ThinkingNodeBranch
        title={node.title}
        rawText={node.rawText}
        defaultOpen={!hasTools}
        node={node}
      />
    )
  }
  if (node.isRoster && node.rosterItems) {
    return <SubagentRoster node={node} renderItemTree={(item) => nestedTree(item.children, true)} />
  }
  if (node.kind === "delegate") {
    return <SubagentRow node={node} tree={nestedTree(node.children, true)} />
  }
  if (node.isBatch && node.batchItems) {
    return <BatchEditingGroupRow node={node} />
  }
  return (
    <>
      <ToolStepNodeRow node={node} />
      {node.children && node.children.length > 0 ? nestedTree(node.children, compact) : null}
    </>
  )
}
