/**
 * 助手泡底脚文案：本轮 stamp 的引擎 · 模型。
 * 没选模型的 ACP 引擎跑完，modelId 是占位 `cli:<引擎 id>`（agent-run-payload / agent-run-start），
 * 它不是模型名：当作「没有模型」，底脚只显示引擎名（luna P3：别露出「Amp · cli:amp」）。
 */
import { formatHistoryModelLabel } from "./model-switch-state.ts"

type ModelRow = { id: string; label?: string }
type ToolRow = { id: string; label?: string; models?: ModelRow[] }

/** `cli:` 开头的占位 modelId：不是模型。 */
export function isCliPlaceholderModelId(modelId: string | null | undefined): boolean {
  return Boolean(modelId?.trim().startsWith("cli:"))
}

export function turnModelText(input: {
  runtimeId?: string | null
  modelId?: string | null
  modelLabel?: string | null
  enjoyLocalLabel: string
  catalog: ModelRow[]
  tools: ToolRow[]
  rememberedToolLabel?: (runtimeId: string) => string | undefined
}): string | null {
  const { runtimeId, catalog, tools } = input
  const tool = runtimeId ? tools.find((row) => row.id === runtimeId) : undefined
  const engine =
    runtimeId === "enjoy-local"
      ? input.enjoyLocalLabel
      : runtimeId
      ? (tool?.label ?? input.rememberedToolLabel?.(runtimeId) ?? runtimeId)
      : undefined
  const stampedLabel = input.modelLabel?.trim()
  const label = stampedLabel && !isCliPlaceholderModelId(stampedLabel) ? stampedLabel : ""
  const modelId = isCliPlaceholderModelId(input.modelId) ? "" : (input.modelId?.trim() ?? "")
  const model =
    label ||
    (modelId
      ? (catalog.find((item) => item.id === modelId)?.label ??
        tool?.models?.find((item) => item.id === modelId)?.label ??
        modelId)
      : undefined)
  return formatHistoryModelLabel({ engineLabel: engine, modelLabel: model })
}
