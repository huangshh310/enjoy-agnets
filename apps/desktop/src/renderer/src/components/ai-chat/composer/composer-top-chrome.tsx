/**
 * Composer 瘦身顶栏：左探索|执行，右单一引擎·模型芯片 + 思考小档。
 * 禁止并排 AgentPicker + ComposerModelChip，禁止 SessionGoal 贴分段旁。
 */
import { AgentPicker } from "../agent-picker"
import { ExploreExecuteToggle } from "./explore-execute/explore-execute-toggle"
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
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 pt-0.5 pb-1">
      <ExploreExecuteToggle />
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
        <AgentPicker
          modelId={modelId}
          modelLabel={modelLabel}
          models={models}
          onModelChange={onModelChange}
        />
        <ComposerThinkingChrome compact modelId={modelId} modelLabel={modelLabel} models={models} />
      </div>
    </div>
  )
}
