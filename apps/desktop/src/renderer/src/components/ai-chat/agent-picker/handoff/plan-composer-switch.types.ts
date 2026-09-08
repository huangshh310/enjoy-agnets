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
  banner: EngineHandoffBanner | null
}
