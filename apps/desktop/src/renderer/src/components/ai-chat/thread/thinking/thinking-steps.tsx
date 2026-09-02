/**
 * Thinking 时间线与 Agent 步骤树：
 * 统一在单一树形导轨中呈现模型思考节点、工具执行链路与文件变更胶囊。
 */
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { AgentStepTree } from "./agent-step-tree"
import type { AgentStepNode } from "./agent-step-tree.types"
import { fileChangesFromRows } from "./thinking-chips"
import type { TraceRow } from "./thinking-rows"
import { FileChangeChips } from "@/components/ai-elements/tool-chips"
import { useT } from "@renderer/i18n"

export function ThinkingSteps({
  nodes = [],
  rows = []
}: {
  nodes?: AgentStepNode[]
  rows?: TraceRow[]
}) {
  const t = useT()
  const hasNodes = nodes.length > 0
  const fileChanges = fileChangesFromRows(rows)

  if (!hasNodes && fileChanges.length === 0) {
    return (
      <p className="py-1 text-caption-1-medium text-text-tertiary">
        {t("chat.noTrace")}
      </p>
    )
  }

  return (
    <div className="relative mt-1 ml-1 pl-2 flex flex-col gap-2">
      {/* 1. 一体化 Agent 步骤与思考时间线树 */}
      {hasNodes ? <AgentStepTree nodes={nodes} /> : null}

      {/* 2. 关联文件变更胶囊 (File Changes) */}
      {fileChanges.length > 0 ? (
        <div className="mt-1 pt-1.5 border-t border-border-button-default/50">
          <FileChangeChips
            files={fileChanges}
            onOpenFile={(path) => void openChangedFile(path)}
          />
        </div>
      ) : null}
    </div>
  )
}
