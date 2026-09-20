/**
 * I1 同引擎换模：能力表 + 登录态 + 名单，决定芯片能不能开、开了画什么。
 * 不支持必须禁用，禁止空表假装成功。
 */
import type { EngineReadiness } from "../components/ai-chat/agent-picker/engine-readiness"

export type ModelSwitchKind = "unsupported" | "needs_login" | "empty" | "ready"

/** 未声明 models 或 none = 此引擎不支持中途换模型。 */
export function supportsMidSessionModelSwitch(models: "none" | "catalog" | "inspect"): boolean {
  return models !== "none"
}

/** 官方-only 跟登录态；名单空要诚实，不要 toast 已切换。 */
export function modelSwitchKind(input: {
  modelsCapability: "none" | "catalog" | "inspect"
  readiness: EngineReadiness
  modelCount: number
}): ModelSwitchKind {
  if (!supportsMidSessionModelSwitch(input.modelsCapability)) return "unsupported"
  if (isModelSwitchLoginBlocked(input.readiness)) return "needs_login"
  if (input.modelCount <= 0) return "empty"
  return "ready"
}

export function isModelSwitchLoginBlocked(readiness: EngineReadiness): boolean {
  return (
    readiness === "needs_login" ||
    readiness === "inspecting" ||
    readiness === "authorizing" ||
    readiness === "login_failed"
  )
}

/** 历史气泡只认本轮 stamp，不读当前 picker。 */
export function formatHistoryModelLabel(input: {
  engineLabel?: string | null
  modelLabel?: string | null
}): string | null {
  const engine = input.engineLabel?.trim() ?? ""
  const model = input.modelLabel?.trim() ?? ""
  if (engine && model) return `${engine} · ${model}`
  return model || engine || null
}

export function shortSessionId(sessionId: string | null | undefined): string {
  const id = sessionId?.trim() ?? ""
  if (!id) return ""
  return id.length <= 8 ? id : id.slice(0, 8)
}
