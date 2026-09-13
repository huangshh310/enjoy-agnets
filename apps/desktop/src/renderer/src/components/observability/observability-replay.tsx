/**
 * Stream Event Replay Buffer 事件回放全景工作台 (Stream Event Replay Workbench)：
 * 监控主进程内存环形缓冲事件（Ring Buffer，容量 400）、支持实时监听、动态回放播放器、
 * Sequence 严格保序重排、事件深度检查器与引导式演练。
 */
import { useEffect, useMemo, useState } from "react"
import {
  RiArrowRightLine,
  RiCheckLine,
  RiClipboardLine,
  RiHistoryLine,
  RiInformationLine,
  RiLoader4Line,
  RiNodeTree,
  RiPauseLine,
  RiPlayLine,
  RiPulseLine,
  RiRefreshLine,
  RiRestartLine,
  RiSearchLine,
  RiShieldCheckLine,
  RiSkipForwardLine,
  RiSparklingLine,
  RiSpeedUpLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"

type ReplayRow = {
  type: string
  runId?: string
  sequence?: number
  timestamp?: number
  toolName?: string
  decision?: string
}

type EventFilterType = "all" | "run" | "tool" | "approval" | "text"

const SAMPLE_REPLAY_EVENTS: ReplayRow[] = [
  {
    type: "run.start",
    runId: "run_sample_agent_demo",
    sequence: 1,
    timestamp: Date.now() - 3200
  },
  {
    type: "text.delta",
    runId: "run_sample_agent_demo",
    sequence: 2,
    timestamp: Date.now() - 3050
  },
  {
    type: "tool.start",
    runId: "run_sample_agent_demo",
    sequence: 3,
    timestamp: Date.now() - 2700,
    toolName: "read_file"
  },
  {
    type: "approval.required",
    runId: "run_sample_agent_demo",
    sequence: 4,
    timestamp: Date.now() - 2680,
    toolName: "read_file"
  },
  {
    type: "approval.resolved",
    runId: "run_sample_agent_demo",
    sequence: 5,
    timestamp: Date.now() - 2100,
    toolName: "read_file",
    decision: "allow"
  },
  {
    type: "tool.result",
    runId: "run_sample_agent_demo",
    sequence: 6,
    timestamp: Date.now() - 1950,
    toolName: "read_file"
  },
  {
    type: "text.delta",
    runId: "run_sample_agent_demo",
    sequence: 7,
    timestamp: Date.now() - 1600
  },
  {
    type: "tool.start",
    runId: "run_sample_agent_demo",
    sequence: 8,
    timestamp: Date.now() - 1200,
    toolName: "bash"
  },
  {
    type: "tool.result",
    runId: "run_sample_agent_demo",
    sequence: 9,
    timestamp: Date.now() - 400,
    toolName: "bash"
  },
  {
    type: "text.delta",
    runId: "run_sample_agent_demo",
    sequence: 10,
    timestamp: Date.now() - 150
  },
  {
    type: "run.end",
    runId: "run_sample_agent_demo",
    sequence: 11,
    timestamp: Date.now()
  }
]

export function ObservabilityReplay() {
  const t = useT()
  const [rows, setRows] = useState<ReplayRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<EventFilterType>("all")
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<ReplayRow | null>(null)

  // 回放播放器状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackIndex, setPlaybackIndex] = useState<number>(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1)
  const [copied, setCopied] = useState(false)

  // 1. 从主进程内存缓冲加载事件流
  async function loadReplay() {
    if (!hasIde()) return
    setIsLoading(true)
    setIsDemo(false)
    setIsPlaying(false)
    try {
      const result = await getIde().observability.replay({ limit: 400 })
      const list = (result as ReplayRow[]) ?? []
      // 按 sequence 升序严格重排 (orderReplayEvents 逻辑)
      const sorted = [...list].sort((a, b) => {
        const seqDiff = (a.sequence ?? 999999) - (b.sequence ?? 999999)
        if (seqDiff !== 0) return seqDiff
        return (a.timestamp ?? 0) - (b.timestamp ?? 0)
      })
      setRows(sorted)
      if (sorted.length > 0) setSelectedRow(sorted[0])
    } finally {
      setIsLoading(false)
    }
  }

  // 挂载时拉取，并监听主进程实时事件广播
  useEffect(() => {
    void loadReplay()

    if (!hasIde()) return
    const unsub = getIde().agent.onEvent((raw) => {
      const ev = raw as Record<string, unknown>
      const newRow: ReplayRow = {
        type: String(ev.type ?? ""),
        runId: typeof ev.runId === "string" ? ev.runId : undefined,
        sequence: typeof ev.sequence === "number" ? ev.sequence : undefined,
        timestamp: typeof ev.timestamp === "number" ? ev.timestamp : Date.now(),
        toolName: typeof ev.name === "string" ? ev.name : undefined,
        decision: typeof ev.decision === "string" ? ev.decision : undefined
      }

      setRows((prev) => {
        const next = [newRow, ...prev.filter((r) => r.sequence !== newRow.sequence || r.runId !== newRow.runId)]
        const sorted = next.sort((a, b) => (a.sequence ?? 999999) - (b.sequence ?? 999999))
        return sorted.slice(0, 400)
      })
    })

    return () => {
      unsub()
    }
  }, [])

  // 载入示例回放数据
  function handleLoadDemo() {
    setIsDemo(true)
    setRows(SAMPLE_REPLAY_EVENTS)
    setSelectedRow(SAMPLE_REPLAY_EVENTS[0])
    setPlaybackIndex(0)
    setIsPlaying(false)
  }

  // 提取统计指标
  const stats = useMemo(() => {
    const total = rows.length
    const runSet = new Set<string>()
    let runEvents = 0
    let toolEvents = 0
    let approvalEvents = 0
    let textEvents = 0

    for (const r of rows) {
      if (r.runId) runSet.add(r.runId)
      if (r.type.startsWith("run.")) runEvents++
      else if (r.type.startsWith("tool.")) toolEvents++
      else if (r.type.startsWith("approval.")) approvalEvents++
      else if (r.type.startsWith("text.")) textEvents++
    }

    return {
      total,
      capacityPercent: Math.min(Math.round((total / 400) * 100), 100),
      uniqueRuns: Array.from(runSet),
      runEvents,
      toolEvents,
      approvalEvents,
      textEvents
    }
  }, [rows])

  // 过滤后的事件列表
  const filteredRows = useMemo(() => {
    let result = rows

    if (selectedRunId) {
      result = result.filter((r) => r.runId === selectedRunId)
    }

    if (typeFilter === "run") {
      result = result.filter((r) => r.type.startsWith("run."))
    } else if (typeFilter === "tool") {
      result = result.filter((r) => r.type.startsWith("tool."))
    } else if (typeFilter === "approval") {
      result = result.filter((r) => r.type.startsWith("approval."))
    } else if (typeFilter === "text") {
      result = result.filter((r) => r.type.startsWith("text."))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.type.toLowerCase().includes(q) ||
          (r.runId && r.runId.toLowerCase().includes(q)) ||
          (r.toolName && r.toolName.toLowerCase().includes(q)) ||
          (r.decision && r.decision.toLowerCase().includes(q))
      )
    }

    return result
  }, [rows, selectedRunId, typeFilter, search])

  // 自动播放时钟
  useEffect(() => {
    if (!isPlaying) return
    if (filteredRows.length === 0) {
      setIsPlaying(false)
      return
    }

    const intervalMs = Math.max(800 / playbackSpeed, 150)
    const timer = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= filteredRows.length - 1) {
          setIsPlaying(false)
          return prev
        }
        const next = prev + 1
        setSelectedRow(filteredRows[next] ?? null)
        return next
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [isPlaying, playbackSpeed, filteredRows])

  // 单步快进
  function handleStepForward() {
    if (filteredRows.length === 0) return
    setPlaybackIndex((prev) => {
      const next = Math.min(prev + 1, filteredRows.length - 1)
      setSelectedRow(filteredRows[next] ?? null)
      return next
    })
  }

  // 重置回放
  function handleResetPlayback() {
    setIsPlaying(false)
    setPlaybackIndex(0)
    if (filteredRows.length > 0) setSelectedRow(filteredRows[0])
  }

  function handleCopyJson() {
    if (!selectedRow) return
    void navigator.clipboard.writeText(JSON.stringify(selectedRow, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 pb-8 font-mono text-[11px]">
      {/* 1. 顶栏：缓冲区架构与状态条 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-separator-border/70 bg-background-primary-default px-3.5 py-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>内存环形回放缓冲 (Ring Buffer)</span>
            <span className="text-emerald-500/50">·</span>
            <span>容量 400 槽位</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-text-tertiary text-[10.5px]">
            <RiShieldCheckLine className="size-3.5 text-emerald-500" />
            <span>Prompt 参数已脱敏保护</span>
          </div>

          {isDemo ? (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              当前展示模拟示例数据
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {rows.length === 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleLoadDemo}
              className="gap-1.5 h-7 text-caption-2-medium text-accent-600 dark:text-accent-400 border-accent-500/30 hover:bg-accent-500/10"
            >
              <RiSparklingLine className="size-3" />
              <span>载入经典 Agent 回放示例</span>
            </Button>
          ) : isDemo ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadReplay()}
              className="gap-1.5 h-7 text-caption-2-medium text-text-secondary"
            >
              <span>切回真实缓冲</span>
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={() => void loadReplay()}
            className="gap-1.5 h-7 text-caption-2-medium shrink-0"
          >
            {isLoading ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiRefreshLine className="size-3" />
            )}
            <span>{t("pages.observability.refreshEvents")}</span>
          </Button>
        </div>
      </div>

      {/* 2. 核心 KPI 仪表卡片 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* 卡片 1: 缓冲池水位 */}
        <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-[11px] font-medium">缓冲池水位</span>
            <RiTerminalBoxLine className="size-4 text-accent-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-title-3-semibold font-bold text-text-primary">
              {stats.total}
            </span>
            <span className="text-text-tertiary text-[11px]">/ 400 槽位</span>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <div className="h-1.5 w-full rounded-full bg-background-secondary-default overflow-hidden">
              <div
                style={{ width: `${stats.capacityPercent}%` }}
                className="h-full bg-accent-500 rounded-full transition-all"
              />
            </div>
            <span className="text-[9.5px] text-text-tertiary">
              {stats.capacityPercent}% 已使用 · 满额自动滑动覆盖
            </span>
          </div>
        </div>

        {/* 卡片 2: 活跃 Run 批次 */}
        <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-[11px] font-medium">捕获会话 Run</span>
            <RiPulseLine className="size-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-title-3-semibold font-bold text-text-primary">
              {stats.uniqueRuns.length}
            </span>
            <span className="text-text-tertiary text-[11px]">个独立会话</span>
          </div>
          <div className="mt-2 text-[10px] text-text-tertiary truncate">
            {stats.uniqueRuns.length > 0 ? (
              <span>最近: {stats.uniqueRuns[0].slice(0, 16)}</span>
            ) : (
              <span>等待新执行流入</span>
            )}
          </div>
        </div>

        {/* 卡片 3: 事件类型构成 */}
        <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-[11px] font-medium">事件类型细分</span>
            <RiNodeTree className="size-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="text-blue-500 font-semibold">{stats.runEvents} 周期</span>
            <span>·</span>
            <span className="text-purple-500 font-semibold">{stats.toolEvents} 工具</span>
            <span>·</span>
            <span className="text-amber-500 font-semibold">{stats.approvalEvents} 审批</span>
          </div>
          <div className="mt-2 text-[10px] text-text-tertiary">
            包含 {stats.textEvents} 个流式输出 Token 增量
          </div>
        </div>

        {/* 卡片 4: 补偿保序状态 */}
        <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-[11px] font-medium">断线重放机制</span>
            <RiHistoryLine className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-title-3-semibold font-bold text-emerald-600 dark:text-emerald-400">
              就绪
            </span>
            <span className="text-[10px] text-text-tertiary font-normal">orderReplayEvents</span>
          </div>
          <div className="mt-2 text-[10px] text-text-tertiary">
            按 Sequence 升序强对齐 · 乱序自动重排
          </div>
        </div>
      </div>

      {/* 3. 播放与步进控制器 + 筛选工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-3 shadow-2xs">
        {/* 左侧：模拟播放控制器 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPlaying ? "default" : "outline"}
            disabled={filteredRows.length === 0}
            onClick={() => setIsPlaying(!isPlaying)}
            className="gap-1.5 h-7 text-caption-2-medium"
          >
            {isPlaying ? <RiPauseLine className="size-3.5" /> : <RiPlayLine className="size-3.5 text-accent-500" />}
            <span>{isPlaying ? "暂停回放" : "模拟播放"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={filteredRows.length === 0 || playbackIndex >= filteredRows.length - 1}
            onClick={handleStepForward}
            className="gap-1 h-7 text-caption-2-medium"
            title="单步跳进至下一个事件"
          >
            <RiSkipForwardLine className="size-3" />
            <span>单步</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={filteredRows.length === 0 || playbackIndex === 0}
            onClick={handleResetPlayback}
            className="gap-1 h-7 text-caption-2-medium"
            title="重置到首个事件"
          >
            <RiRestartLine className="size-3" />
            <span>重置</span>
          </Button>

          {/* 播放速率切换 */}
          <div className="flex items-center gap-1 rounded-md bg-background-secondary-default p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setPlaybackSpeed(1)}
              className={cx(
                "rounded px-1.5 py-0.5 font-bold transition-colors",
                playbackSpeed === 1 ? "bg-background-primary-default text-text-primary shadow-2xs" : "text-text-tertiary"
              )}
            >
              1x
            </button>
            <button
              type="button"
              onClick={() => setPlaybackSpeed(2)}
              className={cx(
                "rounded px-1.5 py-0.5 font-bold transition-colors",
                playbackSpeed === 2 ? "bg-background-primary-default text-text-primary shadow-2xs" : "text-text-tertiary"
              )}
            >
              2x
            </button>
            <button
              type="button"
              onClick={() => setPlaybackSpeed(5)}
              className={cx(
                "rounded px-1.5 py-0.5 font-bold transition-colors",
                playbackSpeed === 5 ? "bg-background-primary-default text-text-primary shadow-2xs" : "text-text-tertiary"
              )}
            >
              5x
            </button>
          </div>

          <span className="hidden sm:inline text-text-tertiary text-[10.5px]">
            当前进度: #{playbackIndex + 1} / {filteredRows.length}
          </span>
        </div>

        {/* 右侧：过滤与搜索 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 事件类型分段过滤 */}
          <div className="flex items-center gap-1 rounded-lg bg-background-secondary-default p-0.5 text-[10.5px]">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cx(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                typeFilter === "all"
                  ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-tertiary hover:text-text-primary"
              )}
            >
              全部 ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("run")}
              className={cx(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                typeFilter === "run"
                  ? "bg-background-primary-default text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-text-tertiary hover:text-blue-500"
              )}
            >
              生命周期
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("tool")}
              className={cx(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                typeFilter === "tool"
                  ? "bg-background-primary-default text-purple-600 dark:text-purple-400 shadow-2xs font-semibold"
                  : "text-text-tertiary hover:text-purple-500"
              )}
            >
              工具
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("approval")}
              className={cx(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                typeFilter === "approval"
                  ? "bg-background-primary-default text-amber-600 dark:text-amber-400 shadow-2xs font-semibold"
                  : "text-text-tertiary hover:text-amber-500"
              )}
            >
              审批
            </button>
          </div>

          {/* 会话 Run 快速下拉筛选 */}
          {stats.uniqueRuns.length > 0 && (
            <select
              value={selectedRunId ?? ""}
              onChange={(e) => {
                setSelectedRunId(e.target.value || null)
                setPlaybackIndex(0)
              }}
              className="h-7 max-w-[150px] truncate rounded-lg border border-separator-border/60 bg-background-secondary-default px-2 text-[10.5px] text-text-primary focus:outline-none"
              title="按活跃 Run 过滤"
            >
              <option value="">全部 Run ({stats.uniqueRuns.length})</option>
              {stats.uniqueRuns.map((id) => (
                <option key={id} value={id}>
                  {id.length > 18 ? `${id.slice(0, 16)}…` : id}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-40 sm:w-48">
            <RiSearchLine className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索事件或 Run ID…"
              className="pl-7 h-7 text-[10.5px] bg-background-secondary-default/50 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 4. 双栏事件流工作台 (左侧时序列表 + 右侧事件详情检查器) */}
      {filteredRows.length === 0 ? (
        /* 空态卡片：引导与交互式演练 */
        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border border-dashed border-separator-border/70 bg-background-primary-default p-8 text-center shadow-2xs">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 mb-3">
            <RiTerminalBoxLine className="size-6" />
          </div>

          <h3 className="text-title-3-semibold font-bold text-text-primary">
            当前主进程内存事件流暂无暂存
          </h3>
          <p className="mt-1.5 max-w-md text-caption-1-medium text-text-secondary leading-relaxed">
            内存环形回放缓冲（Ring Buffer）随应用冷启重置，专用于正在运行的任务、工具调用时序捕获与实时断线重连补偿。
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="default"
              onClick={handleLoadDemo}
              className="gap-2 text-caption-2-medium"
            >
              <RiSparklingLine className="size-3.5" />
              <span>载入经典 Agent 执行流体验回放</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => void loadReplay()}
              className="gap-1.5 text-caption-2-medium"
            >
              <RiRefreshLine className="size-3.5" />
              <span>刷新检查真实缓冲</span>
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full text-left text-[11px] pt-4 border-t border-separator-border/40">
            <div className="rounded-lg bg-background-secondary-default/40 p-3 border border-separator-border/30">
              <span className="font-semibold text-text-primary">1. Sequence 严格全序</span>
              <p className="mt-1 text-[10px] text-text-tertiary leading-relaxed">
                每个主进程推送到前端的事件都携带原子自增序号，防止异步乱序。
              </p>
            </div>
            <div className="rounded-lg bg-background-secondary-default/40 p-3 border border-separator-border/30">
              <span className="font-semibold text-text-primary">2. 断线无缝重放</span>
              <p className="mt-1 text-[10px] text-text-tertiary leading-relaxed">
                网络抖动或渲染重载时，通过 `observability.replay` 瞬间追平最新进度。
              </p>
            </div>
            <div className="rounded-lg bg-background-secondary-default/40 p-3 border border-separator-border/30">
              <span className="font-semibold text-text-primary">3. 隐私切片脱敏</span>
              <p className="mt-1 text-[10px] text-text-tertiary leading-relaxed">
                回放事件由 `summarizeReplayEvents` 剥离 prompt 与敏感参数。
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 数据充实状态：左侧时序列表 + 右侧事件详情检查器 */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[420px]">
          {/* 左侧 7 列：事件流时间线表格 */}
          <div className="lg:col-span-7 flex flex-col rounded-xl border border-separator-border/70 bg-background-primary-default overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-separator-border/50 bg-background-secondary-default/30 text-[10.5px]">
              <span className="font-semibold text-text-primary">
                事件时序流 ({filteredRows.length} 条)
              </span>
              <span className="text-text-tertiary">
                点击单行检查结构化载荷
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-separator-border/30 max-h-[520px]">
              {filteredRows.map((row, idx) => {
                const isSelected = selectedRow === row || playbackIndex === idx
                const typeColor = row.type.startsWith("run.")
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : row.type.startsWith("tool.")
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    : row.type.startsWith("approval.")
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"

                return (
                  <div
                    key={`${row.runId ?? "run"}-${row.sequence ?? idx}`}
                    onClick={() => {
                      setSelectedRow(row)
                      setPlaybackIndex(idx)
                    }}
                    className={cx(
                      "flex items-center justify-between px-3.5 py-2 transition-colors cursor-pointer text-[11px]",
                      isSelected
                        ? "bg-accent-500/10 ring-1 ring-inset ring-accent-500/30"
                        : "hover:bg-background-secondary-hover/40"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* 序列号 */}
                      <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-[10px] font-bold text-text-tertiary shrink-0">
                        #{String(row.sequence ?? idx + 1).padStart(3, "0")}
                      </span>

                      {/* 事件类型标签 */}
                      <span
                        className={cx(
                          "rounded-md px-2 py-0.5 text-[10.5px] font-bold border shrink-0",
                          typeColor
                        )}
                      >
                        {row.type}
                      </span>

                      {/* 工具名称 / 决策说明 */}
                      {row.toolName ? (
                        <span className="rounded bg-purple-500/10 px-1.5 py-0.2 text-[10px] text-purple-600 dark:text-purple-400 font-semibold truncate">
                          tool: {row.toolName}
                        </span>
                      ) : null}

                      {row.decision ? (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                          decision: {row.decision}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[10.5px] text-text-tertiary">
                      {row.runId ? (
                        <span className="hidden sm:inline font-mono">
                          {row.runId.slice(0, 14)}
                        </span>
                      ) : null}
                      <RiArrowRightLine
                        className={cx(
                          "size-3 transition-transform",
                          isSelected ? "text-accent-500 translate-x-0.5" : "text-text-tertiary/40"
                        )}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 底部摘要 */}
            <div className="flex items-center justify-between px-3.5 py-2 border-t border-separator-border/40 bg-background-secondary-default/20 text-[10px] text-text-tertiary">
              <span>已加载 {filteredRows.length} 个流式回放事件</span>
              <span>Sequence 升序保序就绪</span>
            </div>
          </div>

          {/* 右侧 5 列：选中事件深度检查器 */}
          <div className="lg:col-span-5 flex flex-col rounded-xl border border-separator-border/70 bg-background-primary-default overflow-hidden shadow-2xs">
            {selectedRow ? (
              <div className="flex flex-col h-full">
                {/* 检查器头部 */}
                <div className="flex items-center justify-between border-b border-separator-border/50 bg-background-secondary-default/30 p-3.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <RiTerminalBoxLine className="size-4 text-accent-500 shrink-0" />
                    <h4 className="font-bold text-caption-1-medium text-text-primary truncate">
                      {selectedRow.type}
                    </h4>
                  </div>
                  <span className="rounded bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-bold text-accent-600 dark:text-accent-400 shrink-0">
                    Seq #{selectedRow.sequence ?? "—"}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3.5 overflow-y-auto max-h-[500px]">
                  {/* 事件语义说明卡 */}
                  <div className="rounded-lg border border-separator-border/50 bg-background-secondary-default/40 p-3">
                    <div className="flex items-center gap-1.5 text-text-primary font-semibold text-[11px] mb-1">
                      <RiInformationLine className="size-3.5 text-blue-500" />
                      <span>事件语义说明</span>
                    </div>
                    <p className="text-[10.5px] text-text-secondary leading-relaxed">
                      {selectedRow.type === "run.start"
                        ? "Agent 会话启动阶段：初始化工作区上下文、分配 Run ID，准备接收用户指令。"
                        : selectedRow.type === "tool.start"
                          ? `工具执行阶段：触发系统工具「${selectedRow.toolName ?? "tool"}」，进入参数求值与沙箱运行。`
                          : selectedRow.type === "approval.required"
                            ? `安全审批阻断：工具「${selectedRow.toolName ?? "tool"}」触及敏感权限（写文件/Bash），等待人工授权。`
                            : selectedRow.type === "approval.resolved"
                              ? `审批决策已落定：用户已签署 ${selectedRow.decision ?? "allow"} 授权，流水线恢复推进。`
                              : selectedRow.type === "tool.result"
                                ? `工具执行收口：工具「${selectedRow.toolName ?? "tool"}」执行完毕，返回输出结构。`
                                : selectedRow.type === "text.delta"
                                  ? "流式文本增量：模型吐字 Token 块，实时流式投递给客户端界面渲染。"
                                  : selectedRow.type === "run.end"
                                    ? "会话正常结束：Agent 循环收敛，状态归档并写入本地性能指标库。"
                                    : "通用流式事件：主进程与工作区之间的底层通信事件。"}
                    </p>
                  </div>

                  {/* 属性细分网格 */}
                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    <div className="rounded bg-background-secondary-default/50 p-2 border border-separator-border/40">
                      <span className="text-text-tertiary block text-[9.5px]">Run ID</span>
                      <span className="font-bold text-text-primary truncate block mt-0.5">
                        {selectedRow.runId ?? "无"}
                      </span>
                    </div>
                    <div className="rounded bg-background-secondary-default/50 p-2 border border-separator-border/40">
                      <span className="text-text-tertiary block text-[9.5px]">记录时间戳</span>
                      <span className="font-bold text-text-primary block mt-0.5">
                        {selectedRow.timestamp
                          ? new Date(selectedRow.timestamp).toLocaleTimeString()
                          : "实时捕获"}
                      </span>
                    </div>
                  </div>

                  {/* 原始脱敏 JSON 载荷 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-semibold text-text-tertiary uppercase">脱敏事件载荷 (JSON)</span>
                      <button
                        type="button"
                        onClick={handleCopyJson}
                        className="inline-flex items-center gap-1 text-accent-500 hover:text-accent-600 transition-colors"
                      >
                        {copied ? (
                          <>
                            <RiCheckLine className="size-3 text-emerald-500" />
                            <span>已复制</span>
                          </>
                        ) : (
                          <>
                            <RiClipboardLine className="size-3" />
                            <span>复制载荷</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="rounded-lg border border-separator-border/60 bg-background-secondary-default/60 p-3 font-mono text-[10.5px] text-text-primary leading-relaxed overflow-x-auto">
                      {JSON.stringify(selectedRow, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-text-tertiary text-center">
                点击左侧任意事件行展开检查
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. 底部原理解析与断线补偿指引卡 */}
      <div className="rounded-xl border border-separator-border/70 bg-gradient-to-r from-background-secondary-default/30 via-background-primary-default to-background-secondary-default/20 p-4 shadow-2xs font-mono text-[11px]">
        <div className="flex items-center gap-2 mb-2">
          <RiSpeedUpLine className="size-4 text-accent-500" />
          <h4 className="text-caption-1-medium font-semibold text-text-primary">
            为什么会有「事件流回放缓冲」？
          </h4>
        </div>
        <p className="text-caption-2-medium text-text-secondary leading-relaxed">
          Enjoy Agents 采用主进程与渲染进程分离架构。在网络抖动、窗口重新聚焦、或后台长时间执行时，主进程的
          <strong className="text-text-primary mx-1">EventBuffer 环形缓冲</strong>
          按顺序驻留最新 400 个流式事件。渲染端只要发送已收到的最大 sequence 序号，即可进行增量拉齐重放（Catch-up Replay），保证即使客户端重启或中断，也不遗漏任何中间状态。
        </p>
      </div>
    </div>
  )
}
