/**
 * 检查器（底栏上下文 / 右栏 Context）面对的模型：跟着会话当前真正在用的引擎走。
 * 换助手还在等确认（handoff_pending / blocked_by_approval / disposing）时仍是原来那台——
 * 用户还没点「确认」，底栏不能先写成新助手（mike P3，g163-z1440-4-handoff-confirm）；
 * 确认后 persistRuntimeId 把 runtimeId 换过去，这里自然跟上。所以不收交接阶段 / 目标引擎（leo #170 soft-4）。
 */
import {
  composerActiveModelId,
  composerActiveModelLabel,
  type ComposerActiveModelInput
} from "../../../agent-picker/composer-chip-label.ts"

export function inspectorContextModel(input: {
  runtimeId: string
  catalogId: string
  catalogLabel: string
  sessionModelId?: string
  agents: ReadonlyArray<NonNullable<ComposerActiveModelInput["agent"]> & { id: string }>
}): { id: string; label: string; runtimeId: string } {
  const runtimeId = input.runtimeId
  const agent = input.agents.find((item) => item.id === runtimeId)
  const face = { runtimeId, catalogId: input.catalogId, catalogLabel: input.catalogLabel, sessionModelId: input.sessionModelId, agent }
  return {
    id: composerActiveModelId(face) || runtimeId,
    label: composerActiveModelLabel(face),
    runtimeId
  }
}
