/**
 * 乐观助手泡打上本轮引擎/模型，换模后旧泡不改写。
 * luna P2-2：模型跟**这一发真正交给 agent.run 的**（runModelId = codingAgentRunInput(store).modelId）。
 * 换到 Amp 等 ACP 引擎后 store.modelId / modelLabel 还是上一台 Enjoy 本地的模型（「E2E Stub」），
 * 照它盖章底脚就成了「Amp · E2E Stub」，要重载才对。标签只在它就是这个模型的标签时才用，
 * 否则不盖标签，由 turnModelText 按 id 在目录 / 引擎模型表里找（`cli:` 占位只显示引擎名）。
 */
import { getEffectiveModel } from "./session-model.ts"

export function pendingAssistantStamp(
  store: {
    runtimeId: string
    modelId: string
    modelLabel: string
    sessionId: string | null
    sessionModels: Record<string, string>
  },
  /** 这一发 agent.run 带的 modelId；不传（生图 / 视频）按会话有效模型。 */
  runModelId?: string
): { runtimeId?: string; modelId?: string; modelLabel?: string } {
  const modelId =
    runModelId?.trim() ||
    getEffectiveModel({
      sessionId: store.sessionId,
      sessionModels: store.sessionModels,
      engineDefault: store.modelId
    })
  const label = modelId && modelId === store.modelId.trim() ? store.modelLabel.trim() : ""
  return {
    runtimeId: store.runtimeId || undefined,
    modelId: modelId || undefined,
    modelLabel: label || undefined
  }
}
