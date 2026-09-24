/**
 * Composer Agent 选择器：顶部分组导轨 + 下层本地供应商/CLI 面板。
 * 胶囊只写「引擎 · 模型」，协议词不上芯片。
 */
import type { ModelOption } from "@renderer/stores/chat-store"
import { AgentPickerView } from "./agent-picker-view"
import { useAgentPicker } from "./use-agent-picker"

export function AgentPicker({
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
  const model = useAgentPicker(modelId, modelLabel, models)
  return <AgentPickerView {...model} onModelChange={onModelChange} />
}
