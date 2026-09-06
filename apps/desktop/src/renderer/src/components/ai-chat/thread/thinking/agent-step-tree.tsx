/**
 * Agent Step Tree：思考与工具同一导轨。按步骤切开，不堆整段 reasoning。
 */
import { cx } from "@/utils/cx"
import type { AgentStepNode } from "./agent-step-tree.types"
import { BatchEditingGroupRow } from "./step-tree/batch-group-row"
import { ThinkingNodeBranch } from "./step-tree/thinking-branch"
import { StepGlyph } from "./step-tree/step-glyph"
import { ToolStepNodeRow } from "./step-tree/tool-step-row"

export function AgentStepTree({ nodes, className }: { nodes: AgentStepNode[]; className?: string }) {
  if (nodes.length === 0) return null
  const hasTools = nodes.some((n) => n.kind !== "thinking")

  return (
    <div className={cx("relative flex flex-col gap-2.5 py-1 pl-1 select-none", className)}>
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1
        return (
          <div key={node.id} className="relative flex items-start gap-2.5">
            {!isLast ? (
              <span className="absolute bottom-[-10px] left-1.75 top-5 w-px bg-border-button-default/70" aria-hidden />
            ) : null}
            <div className="relative z-10 mt-0.5 flex size-4 items-center justify-center rounded-full bg-background-primary-default">
              <StepGlyph kind={node.kind} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {node.kind === "thinking" && node.rawText ? (
                <ThinkingNodeBranch
                  title={node.title}
                  rawText={node.rawText}
                  defaultOpen={!hasTools}
                />
              ) : node.isBatch && node.batchItems ? (
                <BatchEditingGroupRow node={node} />
              ) : (
                <ToolStepNodeRow node={node} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
