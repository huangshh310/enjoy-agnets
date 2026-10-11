/**
 * Composer 切引擎状态机形状。有用户轮必须经 HandoffCard。
 */
export type EngineSwitchPhase = "idle" | "handoff_pending" | "blocked_by_approval" | "disposing"

export type EngineSwitchPlan =
  | { kind: "apply"; to: string }
  | { kind: "handoff"; from: string; to: string }
  | { kind: "blocked_by_approval"; from: string; to: string }
  | { kind: "noop" }

export type EngineHandoffBanner = {
  sessionId: string
  fromRuntimeId: string
  toRuntimeId: string
}

export type EngineHandoffState = {
  phase: EngineSwitchPhase
  fromRuntimeId: string | null
  toRuntimeId: string | null
  modelId?: string
  draftSummary: string
  filePaths: string[]
  banner: EngineHandoffBanner | null
  /** 「设为主引擎」穿过 noop / handoff，确认后仍写偏好。 */
  asDefault: boolean
  /** 预设换引擎时先挂着，确认交接后再写入探索/执行和思考档。 */
  pendingPreset: {
    surface: "explore" | "execute"
    reasoningEffort?: "low" | "medium" | "high" | "xhigh"
    acpThoughtLevel?: string
  } | null
}
