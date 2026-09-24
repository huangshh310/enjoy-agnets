/**
 * 检查器面对的模型：交接未完成时看目标引擎，不要沿用上一引擎的档案模型。
 */
import {
  composerActiveModelId,
  composerActiveModelLabel,
  type ComposerActiveModelInput
} from "../../../agent-picker/composer-chip-label.ts"

export function inspectorContextModel(input: {
  phase: string
  toRuntimeId?: string | null
  runtimeId: string
  catalogId: string
  catalogLabel: string
  sessionModelId?: string
  agents: ReadonlyArray<NonNullable<ComposerActiveModelInput["agent"]> & { id: string }>
}): { id: string; label: string; runtimeId: string } {
  const pending = input.phase !== "idle" && input.toRuntimeId ? input.toRuntimeId : ""
  const runtimeId = pending || input.runtimeId
  const agent = input.agents.find((item) => item.id === runtimeId)
  const sessionModelId = pending ? undefined : input.sessionModelId
  const face = { runtimeId, catalogId: input.catalogId, catalogLabel: input.catalogLabel, sessionModelId, agent }
  return {
    id: composerActiveModelId(face) || runtimeId,
    label: composerActiveModelLabel(face),
    runtimeId
  }
}
