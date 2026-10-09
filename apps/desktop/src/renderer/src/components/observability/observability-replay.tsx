/**
 * Stream Event Replay Buffer 事件回放全景工作台 (Stream Event Replay Workbench)：
 * 监控主进程内存环形缓冲事件（Ring Buffer，容量 400）、支持实时监听、动态回放播放器、
 * Sequence 严格保序重排、事件深度检查器与引导式演练。
 */
import { useEffect, useMemo, useState } from "react"
import {
  RiLoader4Line,
  RiRefreshLine,
  RiSparklingLine,
  RiSpeedUpLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  SAMPLE_REPLAY_EVENTS,
  type EventFilterType,
  type ReplayRow
} from "./replay/replay.types"
import { ReplayKpiBar } from "./replay/replay-kpi-bar"
import { ReplayControlsBar } from "./replay/replay-controls-bar"
import { ReplayTimelineTable } from "./replay/replay-timeline-table"
import { ReplayEventInspector } from "./replay/replay-event-inspector"
import { ReplayEmptyCard } from "./replay/replay-empty-card"

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
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
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

  function handleLoadDemo() {
    setIsDemo(true)
    setRows(SAMPLE_REPLAY_EVENTS)
    setSelectedRow(SAMPLE_REPLAY_EVENTS[0])
    setPlaybackIndex(0)
    setIsPlaying(false)
  }

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
    if (!isPlaying || filteredRows.length === 0) return
    const intervalMs = Math.max(200, 1000 / playbackSpeed)
    const timer = setInterval(() => {
      setPlaybackIndex((prev) => {
        const next = prev + 1
        if (next >= filteredRows.length) {
          setIsPlaying(false)
          return prev
        }
        setSelectedRow(filteredRows[next])
        return next
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [isPlaying, filteredRows, playbackSpeed])

  function handleCopyJson() {
    if (!selectedRow) return
    void navigator.clipboard.writeText(JSON.stringify(selectedRow, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. 顶部 Header 与操作区 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 shadow-2xs">
            <RiTerminalBoxLine className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-title-3-semibold font-bold text-text-primary">
                事件流回放缓冲
              </h3>
              {isDemo && (
                <span className="rounded-full border border-status-yellow-text/30 bg-status-yellow-background/10 px-2 py-0.5 text-caption-2-medium font-semibold text-status-yellow-text dark:text-status-yellow-text">
                  模拟演示数据
                </span>
              )}
            </div>
            <p className="text-caption-2-medium text-text-secondary mt-0.5">
              Sequence 全序对齐 · 断线增量拉齐重放 · 隐私脱敏检查
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isDemo && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleLoadDemo}
              className="gap-1.5 h-7 text-caption-2-medium shrink-0 cursor-pointer"
            >
              <RiSparklingLine className="size-3 text-accent-500" />
              <span>载入示例流</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={() => void loadReplay()}
            className="gap-1.5 h-7 text-caption-2-medium shrink-0 cursor-pointer"
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
      <ReplayKpiBar stats={stats} />

      {/* 3. 控制与过滤器工具栏 */}
      <ReplayControlsBar
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onStepForward={() => {
          if (playbackIndex < filteredRows.length - 1) {
            const next = playbackIndex + 1
            setPlaybackIndex(next)
            setSelectedRow(filteredRows[next])
          }
        }}
        onReset={() => {
          setIsPlaying(false)
          setPlaybackIndex(0)
          if (filteredRows.length > 0) setSelectedRow(filteredRows[0])
        }}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        playbackIndex={playbackIndex}
        totalRows={filteredRows.length}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        uniqueRuns={stats.uniqueRuns}
        selectedRunId={selectedRunId}
        onSelectedRunChange={(id) => {
          setSelectedRunId(id)
          setPlaybackIndex(0)
        }}
        search={search}
        onSearchChange={setSearch}
        allRowsCount={rows.length}
      />

      {/* 4. 事件流表格与检查器 */}
      {filteredRows.length === 0 ? (
        <ReplayEmptyCard
          onLoadDemo={handleLoadDemo}
          onRefresh={() => void loadReplay()}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[420px]">
          <ReplayTimelineTable
            rows={filteredRows}
            selectedRow={selectedRow}
            playbackIndex={playbackIndex}
            onSelect={(row, idx) => {
              setSelectedRow(row)
              setPlaybackIndex(idx)
            }}
          />
          <ReplayEventInspector
            selectedRow={selectedRow}
            copied={copied}
            onCopyJson={handleCopyJson}
          />
        </div>
      )}

      {/* 5. 原理解析与说明卡 */}
      <div className="rounded-xl border border-separator-border/70 bg-gradient-to-r from-background-secondary-default/30 via-background-primary-default to-background-secondary-default/20 p-4 shadow-2xs font-mono text-caption-2-medium">
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
