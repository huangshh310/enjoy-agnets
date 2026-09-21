/**
 * 助手行下方的更新进度：步骤 + 耗时 + 最近一行输出。
 */
import { useEffect, useState } from "react"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { installProgressOf, subscribeInstallProgress } from "./install-progress-store"

export function AgentToolInstallProgress({ id }: { id: AgentToolId }) {
  const t = useT()
  const [view, setView] = useState(() => installProgressOf(id))
  const [now, setNow] = useState(Date.now())
  useEffect(() => subscribeInstallProgress(() => setView(installProgressOf(id))), [id])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  if (!view) return null
  const seconds = Math.max(0, Math.floor((now - view.startedAt) / 1000))
  return (
    <div className="mt-1.5 max-w-[36rem]">
      <p className="text-caption-2-medium text-text-primary">{stepLabel(view.step, t)}</p>
      <p className="mt-0.5 text-caption-2-regular text-text-secondary">
        {t("settings.agentTools.installProgressElapsed", { seconds })}
      </p>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-background-secondary-default">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-500" />
      </div>
      {view.detail ? (
        <p className="mt-1 truncate font-mono text-caption-2-regular text-text-secondary" title={view.detail}>
          {view.detail}
        </p>
      ) : null}
    </div>
  )
}

function stepLabel(step: string, t: (key: string) => string): string {
  if (step === "self_update") return t("settings.agentTools.installProgressSelf")
  if (step === "npm") return t("settings.agentTools.installProgressNpm")
  if (step === "brew") return t("settings.agentTools.installProgressBrew")
  if (step === "verify") return t("settings.agentTools.installProgressVerify")
  return t("settings.agentTools.listUpdating")
}
