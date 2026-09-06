/**
 * 智能体工坊 - 顶部指挥舱 (Command Matrix HUD)
 * 聚合展示：当前活跃引擎、就绪比例、ACP 传输层状态、一键全量体检与环境扫描。
 */
import { useState } from "react"
import {
  RiCpuLine,
  RiPulseLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiShieldKeyholeLine,
  RiTerminalBoxLine,
  RiCheckboxCircleFill,
  RiErrorWarningFill
} from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"

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

  // 统计数据
  const readyTools = tools.filter((item) => item.status === "ready" || item.id === DEFAULT_RUNTIME_ID)
  const totalActionable = tools.filter((item) => !item.comingSoon && !item.skillOnly)
  const readyPercent = Math.round((readyTools.length / Math.max(1, totalActionable.length)) * 100)

  // 一键探测本机环境
  async function handleDetect() {
    if (!hasIde() || detecting) return
    setDetecting(true)
    try {
      await getIde().agentTools.detect()
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
    } finally {
      setDetecting(false)
    }
  }

  // 一键全量体检
  async function handleRunAllDiagnostic() {
    if (!hasIde() || diagnosing) return
    setDiagnosing(true)
    setDiagResult(null)
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
    } finally {
      setDiagnosing(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
      {/* 顶部环境漫射背景装饰 */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-accent-500/5 blur-3xl" />

      {/* 头部：标题与快速指令区 */}
      <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-separator-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-accent-500/30 bg-accent-500/10 text-accent-500 shadow-2xs">
            <RiCpuLine className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-title-3-medium text-text-primary">智能体引擎工坊</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2.5 py-0.5 text-caption-2-medium font-semibold text-accent-600 dark:text-accent-400">
                <span className="size-1.5 rounded-full bg-accent-500 animate-pulse" />
                {readyTools.length} 核心在线
              </span>
            </div>
            <p className="mt-0.5 text-caption-1-regular text-text-secondary">
              本机 CLI 与 Enjoy 供应商深度打通：支持注入自定义端点与一键导出到本地终端配置。
            </p>
          </div>
        </div>

        {/* 顶部操作按钮 */}
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
            onClick={() => void handleDetect()}
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
            onClick={() => void handleRunAllDiagnostic()}
            className="gap-1.5 text-caption-1-medium"
          >
            <RiShieldCheckLine className={`size-3.5 ${diagnosing ? "animate-spin" : ""}`} />
            {diagnosing ? "全量诊断中..." : "运行全面体检"}
          </Button>
        </div>
      </div>

      {/* 诊断结果提示条（如果已运行） */}
      {diagResult ? (
        <div
          className={`mt-4 flex items-center justify-between rounded-xl px-3 py-2 text-caption-1-medium ${
            diagResult.failed === 0
              ? "bg-accent-500/10 text-accent-700"
              : "bg-background-secondary-default text-text-secondary"
          }`}
        >
          <div className="flex items-center gap-2">
            {diagResult.failed === 0 ? (
              <RiCheckboxCircleFill className="size-4 text-accent-500" />
            ) : (
              <RiErrorWarningFill className="size-4 text-amber-500" />
            )}
            <span>
              已完成 {diagResult.total} 个引擎体检：{diagResult.ok} 个通信正常
              {diagResult.failed > 0 ? `，${diagResult.failed} 个未响应或需重新登录` : "，协议握手均全绿！"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDiagResult(null)}
            className="text-caption-2-medium hover:underline opacity-80"
          >
            关闭
          </button>
        </div>
      ) : null}

      {/* 核心指标矩阵仪表盘 */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 指标 1：当前生效引擎 */}
        <div className="flex min-w-0 flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
          <span className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
            <span>当前活跃主引擎</span>
            <span className="size-2 rounded-full bg-accent-500 animate-pulse" />
          </span>
          <div className="mt-1.5 flex items-center gap-2 truncate">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default">
              <AgentBrandIcon id={runtimeId} size={14} />
            </span>
            <span className="truncate text-body-medium font-semibold text-text-primary">
              {activeTool?.label ?? runtimeId}
            </span>
          </div>
          <span className="mt-1 truncate font-mono text-[11px] text-text-secondary">
            {runtimeId === DEFAULT_RUNTIME_ID
              ? modelLabel || modelId || "未指定模型"
              : activeTool?.selectedModel || "官方默认模型"}
          </span>
        </div>

        {/* 指标 2：引擎就绪率 */}
        <div className="flex min-w-0 flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
          <span className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
            <span>本机环境装载率</span>
            <RiTerminalBoxLine className="size-3.5 text-text-tertiary" />
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-headline-medium font-bold text-text-primary">
              {readyTools.length}
              <span className="text-caption-1-medium text-text-tertiary">/{totalActionable.length}</span>
            </span>
            <span className="text-caption-2-medium text-accent-600">
              ({readyPercent}% 已装载)
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background-secondary-hover">
            <div
              className="h-full rounded-full bg-accent-500 transition-all duration-500"
              style={{ width: `${readyPercent}%` }}
            />
          </div>
        </div>

        {/* 指标 3：传输与协议层 */}
        <div className="flex min-w-0 flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
          <span className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
            <span>通信与流式协议</span>
            <RiPulseLine className="size-3.5 text-text-tertiary" />
          </span>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent-500" />
            <span className="text-body-medium font-semibold text-text-primary">ACP Stdio 管道</span>
          </div>
          <span className="mt-1 truncate text-caption-2-regular text-text-secondary">
            沙箱隔离 · 实时双向 Token 流
          </span>
        </div>

        {/* 指标 4：工具执行安全 */}
        <div className="flex min-w-0 flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
          <span className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
            <span>执行安全与审批</span>
            <RiShieldCheckLine className="size-3.5 text-text-tertiary" />
          </span>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent-500" />
            <span className="text-body-medium font-semibold text-text-primary">HMAC 签名放行</span>
          </div>
          <span className="mt-1 truncate text-caption-2-regular text-text-secondary">
            写盘 / Shell 命令防误触
          </span>
        </div>
      </div>
    </div>
  )
}
