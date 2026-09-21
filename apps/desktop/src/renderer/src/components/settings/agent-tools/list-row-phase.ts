/**
 * 密表行态：安装与登录检测分开。PATH 找到 ≠ 就绪；检测中禁止当绿灯。
 */
import type { EngineReadiness } from "@renderer/components/ai-chat/agent-picker/engine-readiness"
import type { InstallRowPhase } from "./install-row-copy"
import type { AgentToolBusy } from "./agent-tool-actions-run"

export type ListRowPhase = InstallRowPhase

export function listRowPhase(input: {
  pathReady: boolean
  busy: AgentToolBusy
  installError: string | null
  engineKind: EngineReadiness
}): ListRowPhase {
  if (input.busy === "install") return "installing"
  if (!input.pathReady) {
    if (input.installError?.trim()) return "failed"
    return "idle"
  }
  if (input.engineKind === "inspecting") return "inspecting"
  return "idle"
}
