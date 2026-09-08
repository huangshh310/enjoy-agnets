/**
 * 智能体顶栏：扫描 / 体检 + 密钥边界提示。不含装载率条或常绿灯。
 */
import { useState } from "react"
import { RiRefreshLine, RiShieldCheckLine, RiShieldKeyholeLine } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useT } from "@renderer/i18n"

export function AgentToolsCommandHub() {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const snapshot = useSettingsSnapshot().data
  const [detecting, setDetecting] = useState(false)
  const [diagnosing, setDiagnosing] = useState(false)
  const [diag, setDiag] = useState<{ total: number; ok: number; failed: number } | null>(null)
  const tools = snapshot?.agentTools ?? []
  const readyTools = tools.filter((item) => item.status === "ready" || item.id === DEFAULT_RUNTIME_ID)

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card">
      <p className="rounded-xl bg-background-secondary-default/60 px-3 py-2 text-caption-1-regular text-text-secondary">
        {t("settings.agentTools.keyNotSharedTip")}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-title-3-medium text-text-primary">{t("settings.agentTools.hubTitle")}</h2>
          <p className="mt-0.5 text-caption-1-regular text-text-secondary">{t("settings.agentTools.hubDesc")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
            className="gap-1.5 text-caption-1-medium"
          >
            <RiShieldKeyholeLine className="size-3.5 text-accent-500" />
            {t("settings.agentTools.manageProviders")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={detecting}
            onClick={() => void runDetect(queryClient, detecting, setDetecting)}
            className="gap-1.5 text-caption-1-medium"
          >
            <RiRefreshLine className={`size-3.5 ${detecting ? "animate-spin text-accent-500" : ""}`} />
            {detecting ? t("settings.agentTools.scanning") : t("settings.agentTools.scanEnv")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={diagnosing}
            onClick={() => void runAllDoctor(readyTools, queryClient, diagnosing, setDiagnosing, setDiag)}
            className="gap-1.5 text-caption-1-medium"
          >
            <RiShieldCheckLine className={`size-3.5 ${diagnosing ? "animate-spin" : ""}`} />
            {diagnosing ? t("settings.agentTools.diagnosing") : t("settings.agentTools.runDoctor")}
          </Button>
        </div>
      </div>
      {diag ? (
        <p className="text-caption-2-medium text-text-secondary">
          {t("settings.agentTools.diagSummary", { total: diag.total, ok: diag.ok, failed: diag.failed })}
        </p>
      ) : null}
    </div>
  )
}

async function runDetect(
  queryClient: ReturnType<typeof useQueryClient>,
  detecting: boolean,
  setDetecting: (value: boolean) => void
) {
  if (!hasIde() || detecting) return
  setDetecting(true)
  try {
    await getIde().agentTools.detect()
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
    await queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
  } finally {
    setDetecting(false)
  }
}

async function runAllDoctor(
  readyTools: Array<{ id: string }>,
  queryClient: ReturnType<typeof useQueryClient>,
  diagnosing: boolean,
  setDiagnosing: (value: boolean) => void,
  setDiag: (value: { total: number; ok: number; failed: number }) => void
) {
  if (!hasIde() || diagnosing) return
  setDiagnosing(true)
  try {
    let okCount = 0
    let failedCount = 0
    for (const tool of readyTools) {
      if (tool.id === DEFAULT_RUNTIME_ID) {
        okCount++
        continue
      }
      try {
        const res = (await getIde().agentTools.doctor({ id: tool.id })) as { ok: boolean }
        if (res?.ok) okCount++
        else failedCount++
      } catch {
        failedCount++
      }
    }
    setDiag({ total: readyTools.length, ok: okCount, failed: failedCount })
    await queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
  } finally {
    setDiagnosing(false)
  }
}
