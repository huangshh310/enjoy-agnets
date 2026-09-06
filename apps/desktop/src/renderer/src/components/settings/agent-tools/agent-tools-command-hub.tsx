/**
 * 智能体工坊顶部指挥舱：活跃引擎、就绪比例、扫描与全量体检。
 */
import { useState } from "react"
import {
  RiCheckboxCircleFill,
  RiCpuLine,
  RiErrorWarningFill,
  RiRefreshLine,
  RiShieldCheckLine,
  RiShieldKeyholeLine
} from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { AgentToolsHubMetrics } from "./agent-tools-hub-metrics"

export function AgentToolsCommandHub() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const snapshot = useSettingsSnapshot().data
  const modelId = useChatStore((state) => state.modelId)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const [detecting, setDetecting] = useState(false)
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagResult, setDiagResult] = useState<{ total: number; ok: number; failed: number } | null>(null)
  const runtimeId = snapshot?.preferences.runtimeId ?? DEFAULT_RUNTIME_ID
  const tools = snapshot?.agentTools ?? []
  const activeTool = tools.find((item) => item.id === runtimeId)
  const readyTools = tools.filter((item) => item.status === "ready" || item.id === DEFAULT_RUNTIME_ID)
  const totalActionable = tools.filter((item) => !item.comingSoon && !item.skillOnly)
  const readyPercent = Math.round((readyTools.length / Math.max(1, totalActionable.length)) * 100)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-accent-500/5 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-separator-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-accent-500/30 bg-accent-500/10 text-accent-500 shadow-2xs">
            <RiCpuLine className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-title-3-medium text-text-primary">智能体引擎工坊</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2.5 py-0.5 text-caption-2-medium text-accent-600 dark:text-accent-400">
                <span className="size-1.5 animate-pulse rounded-full bg-accent-500" />
                {readyTools.length} 核心在线
              </span>
            </div>
            <p className="mt-0.5 text-caption-1-regular text-text-secondary">
              本机 CLI 与 Enjoy 供应商深度打通：支持注入自定义端点与一键导出到本地终端配置。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
            className="gap-1.5 text-caption-1-medium hover:border-accent-500/50"
          >
            <RiShieldKeyholeLine className="size-3.5 text-accent-500" />
            模型供应商
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={detecting}
            onClick={() => void runDetect(queryClient, detecting, setDetecting)}
            className="gap-1.5 text-caption-1-medium hover:border-accent-500/40"
          >
            <RiRefreshLine className={`size-3.5 ${detecting ? "animate-spin text-accent-500" : ""}`} />
            {detecting ? "正在扫描 PATH..." : "扫描本机环境"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={diagnosing}
            onClick={() => void runAllDoctor(readyTools, queryClient, diagnosing, setDiagnosing, setDiagResult)}
            className="gap-1.5 text-caption-1-medium"
          >
            <RiShieldCheckLine className={`size-3.5 ${diagnosing ? "animate-spin" : ""}`} />
            {diagnosing ? "全量诊断中..." : "运行全面体检"}
          </Button>
        </div>
      </div>
      {diagResult ? <DiagBanner result={diagResult} onClose={() => setDiagResult(null)} /> : null}
      <AgentToolsHubMetrics
        runtimeId={runtimeId}
        activeLabel={activeTool?.label ?? runtimeId}
        modelText={
          runtimeId === DEFAULT_RUNTIME_ID
            ? modelLabel || modelId || "未指定模型"
            : activeTool?.selectedModel || "官方默认模型"
        }
        readyCount={readyTools.length}
        totalCount={totalActionable.length}
        readyPercent={readyPercent}
      />
    </div>
  )
}

function DiagBanner({
  result,
  onClose
}: {
  result: { total: number; ok: number; failed: number }
  onClose: () => void
}) {
  return (
    <div
      className={`mt-4 flex items-center justify-between rounded-xl px-3 py-2 text-caption-1-medium ${
        result.failed === 0 ? "bg-accent-500/10 text-accent-700" : "bg-background-secondary-default text-text-secondary"
      }`}
    >
      <div className="flex items-center gap-2">
        {result.failed === 0 ? (
          <RiCheckboxCircleFill className="size-4 text-accent-500" />
        ) : (
          <RiErrorWarningFill className="size-4 text-amber-500" />
        )}
        <span>
          已完成 {result.total} 个引擎体检：{result.ok} 个通信正常
          {result.failed > 0 ? `，${result.failed} 个未响应或需重新登录` : "，协议握手均全绿！"}
        </span>
      </div>
      <button type="button" onClick={onClose} className="text-caption-2-medium opacity-80 hover:underline">
        关闭
      </button>
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
  setDiagResult: (value: { total: number; ok: number; failed: number }) => void
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
    setDiagResult({ total: readyTools.length, ok: okCount, failed: failedCount })
    await queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
  } finally {
    setDiagnosing(false)
  }
}
