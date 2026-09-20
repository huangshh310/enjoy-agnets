/**
 * Composer 顶栏铬序：探索|执行 → 思考? → 会话目标 | 引擎 → 模型芯片。
 */
import { useState } from "react"
import { AgentPicker } from "../agent-picker"
import { ExploreExecuteToggle } from "./explore-execute/explore-execute-toggle"
import { ComposerModelChip } from "./model-switch/composer-model-chip"
import { SessionGoalChip } from "./session-goal-chip"
import { ComposerThinkingChrome } from "./thinking/composer-thinking-chrome"
import type { ModelOption } from "@renderer/stores/chat-store"

export function ComposerTopChrome({
  modelId,
  modelLabel,
  models,
  onModelChange
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
  onModelChange: (model: ModelOption) => void
}) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-0.5 pb-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <ExploreExecuteToggle />
        <ComposerThinkingChrome
          modelId={modelId}
          modelLabel={modelLabel}
          models={models}
          onOpenModels={() => setModelMenuOpen(true)}
        />
        <SessionGoalChip />
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        <AgentPicker
          modelId={modelId}
          modelLabel={modelLabel}
          models={models}
          onModelChange={onModelChange}
        />
        <ComposerModelChip
          modelId={modelId}
          modelLabel={modelLabel}
          models={models}
          menuOpen={modelMenuOpen}
          onMenuOpenChange={setModelMenuOpen}
        />
      </div>
    </div>
  )
}
