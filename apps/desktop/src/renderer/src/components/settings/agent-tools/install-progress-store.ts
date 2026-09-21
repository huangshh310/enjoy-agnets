/**
 * 本机 CLI 安装/更新进度：main 推 agentTools.progress，行内订阅。
 */
import type { AgentToolId, AgentToolInstallProgress } from "@enjoy-agents/ipc-contract"

export type InstallProgressView = {
  step: AgentToolInstallProgress["step"]
  detail?: string
  startedAt: number
}

const byId = new Map<string, InstallProgressView>()
const listeners = new Set<() => void>()

export function applyInstallProgress(event: AgentToolInstallProgress) {
  if (event.step === "done") {
    byId.delete(event.id)
  } else if (event.step === "start") {
    byId.set(event.id, { step: event.step, detail: event.detail, startedAt: Date.now() })
  } else {
    const prev = byId.get(event.id)
    byId.set(event.id, {
      step: event.step,
      detail: event.detail ?? prev?.detail,
      startedAt: prev?.startedAt ?? Date.now()
    })
  }
  for (const listen of listeners) listen()
}

export function installProgressOf(id: AgentToolId): InstallProgressView | undefined {
  return byId.get(id)
}

export function subscribeInstallProgress(listen: () => void): () => void {
  listeners.add(listen)
  return () => listeners.delete(listen)
}
