/**
 * Trace 调用生命周期里程碑时序与同模型基准对比 (Trace Milestones & Sibling Comparison)：
 * 呈现清晰的阶段时序演进流水，并对齐同模型平均基准与相邻链路快速跳转。
 */
import { useMemo } from "react"
import {
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiFlashlightLine,
  RiNodeTree,
  RiSendPlaneLine,
  RiSpeedUpLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { formatLatency } from "../model-routing/model-routing-row-cells"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"
import type { TraceReplayEvent } from "../../services/trace-tree-builder"

export function TraceMilestonesStream(props: {
  metric: TelemetryMetric
  events?: TraceReplayEvent[]
  allMetrics?: TelemetryMetric[]
  onSelectMetric?: (metric: TelemetryMetric) => void
}) {
  const { metric, events = [], allMetrics = [], onSelectMetric } = props

  const duration = metric.durationMs ?? 0
  const ttfo = metric.ttfoMs ?? 0
  const inTok = metric.inputTokens ?? 0
  const outTok = metric.outputTokens ?? 0
  const isSuccess =
    metric.status === "success" || metric.status === "completed" || metric.status === "ok"

  // 1. 提炼生命周期里程碑
  const milestones = useMemo(() => {
    const list: Array<{
      timeOffset: string
      title: string
      desc: string
      icon: typeof RiSendPlaneLine
      colorClass: string
      tag: string
    }> = []

    // 步骤 1: 发起请求
    list.push({
      timeOffset: "0ms",
      title: "任务调度与请求发起",
      desc: `向上游 Provider 发起推理，注入提示词上下文与 ${formatTokens(inTok)} 输入 Tokens`,
      icon: RiSendPlaneLine,
      colorClass: "text-blue-500 bg-blue-500/10",
      tag: "REQ_INIT"
    })

    // 中间插入 replay events (若有 tool 或 approval)
    for (const ev of events) {
      if (ev.toolName) {
        list.push({
          timeOffset: ev.timestamp ? `${ev.timestamp}ms` : "阶段中",
          title: `工具调用: ${ev.toolName}`,
          desc: ev.decision ? `审批决策: ${ev.decision}` : "执行本地或远程工具动作",
          icon: RiNodeTree,
          colorClass: "text-purple-500 bg-purple-500/10",
          tag: "TOOL_CALL"
        })
      }
    }

    // 步骤 2: 首字 TTFO
    if (ttfo > 0) {
      list.push({
        timeOffset: `+${ttfo}ms`,
        title: "首字响应送达 (First Chunk / TTFO)",
        desc: `等待 ${ttfo}ms 接收到第一个思考或流式响应块，模型准备进入吐字生成阶段`,
        icon: RiFlashlightLine,
        colorClass: "text-amber-500 bg-amber-500/10",
        tag: "TTFO_CHUNK"
      })
    }

    // 步骤 3: 流式吐字生成完成
    const streamMs = ttfo > 0 && duration > ttfo ? duration - ttfo : duration
    list.push({
      timeOffset: `+${duration}ms`,
      title: "流式输出生成完成",
      desc: `流式耗时 ${streamMs}ms，累计吐出 ${formatTokens(outTok)} 输出 Tokens，生成速率稳定`,
      icon: RiSpeedUpLine,
      colorClass: "text-accent-500 bg-accent-500/10",
      tag: "STREAM_DONE"
    })

    // 步骤 4: 链路归档
    list.push({
      timeOffset: `+${duration}ms`,
      title: isSuccess ? "链路执行成功并归档" : `链路发生异常 (${metric.errorClass ?? "failed"})`,
      desc: `总耗时 ${formatLatency(duration)}，指标已脱敏存入本地 SQLite 数据库`,
      icon: RiCheckDoubleLine,
      colorClass: isSuccess ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10",
      tag: isSuccess ? "STATUS_OK" : "STATUS_ERR"
    })

    return list
  }, [duration, ttfo, inTok, outTok, isSuccess, events, metric.errorClass])

  // 2. 同模型基准与相邻调用链路
  const { siblingTraces, modelAvgDuration, modelCallsCount } = useMemo(() => {
    if (!allMetrics || allMetrics.length === 0) {
      return { siblingTraces: [], modelAvgDuration: 0, modelCallsCount: 0 }
    }

    const sameModel = allMetrics.filter((m) => (m.modelId || "default") === (metric.modelId || "default"))
    const durations = sameModel.map((m) => m.durationMs ?? 0)
    const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
    const siblings = sameModel.filter((m) => m.id !== metric.id).slice(0, 5)

    return {
      siblingTraces: siblings,
      modelAvgDuration: avg,
      modelCallsCount: sameModel.length
    }
  }, [allMetrics, metric.modelId, metric.id])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono text-[11px]">
      {/* 左侧 7 列：生命周期关键里程碑流 */}
      <div className="lg:col-span-7 flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <RiNodeTree className="size-4 text-accent-500 shrink-0" />
            <h4 className="text-caption-1-medium font-semibold text-text-primary">
              执行阶段时序里程碑 (Lifecycle Milestones)
            </h4>
          </div>
          <span className="text-[10px] text-text-tertiary">
            共 {milestones.length} 个关键节点
          </span>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          {milestones.map((m, idx) => {
            const Icon = m.icon
            return (
              <div key={idx} className="flex items-start gap-3 relative">
                {/* 垂直连接虚线 */}
                {idx < milestones.length - 1 ? (
                  <div className="absolute left-3.5 top-7 bottom-0 w-px border-r border-dashed border-separator-border/60 -mb-3" />
                ) : null}

                {/* 步骤图标 */}
                <div
                  className={cx(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg relative z-10",
                    m.colorClass
                  )}
                >
                  <Icon className="size-3.5" />
                </div>

                {/* 步骤描述 */}
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-text-primary text-[11.5px] truncate">
                      {m.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded bg-background-secondary-default px-1.5 py-0.2 text-[9.5px] text-text-tertiary">
                        {m.tag}
                      </span>
                      <span className="font-bold text-text-secondary text-[10.5px]">
                        {m.timeOffset}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-text-secondary leading-relaxed">
                    {m.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 右侧 5 列：同模型性能基准对比 & 相邻链路快速跳转 */}
      <div className="lg:col-span-5 flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <ModelBrandIcon modelId={metric.modelId} size={15} className="shrink-0" />
            <h4 className="text-caption-1-medium font-semibold text-text-primary truncate">
              {metric.modelId ?? "default"} 性能基准
            </h4>
          </div>
          <span className="text-[10px] text-text-tertiary shrink-0">
            采样库共 {modelCallsCount} 次
          </span>
        </div>

        {/* 性能偏离对比小卡 */}
        <div className="flex flex-col gap-1.5 rounded-lg bg-background-secondary-default/50 p-2.5 border border-separator-border/40">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-text-tertiary">同模型基准均值:</span>
            <span className="font-bold text-text-primary">{formatLatency(modelAvgDuration)}</span>
          </div>
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-text-tertiary">当前链路相对表现:</span>
            <span
              className={cx(
                "font-semibold",
                duration <= modelAvgDuration
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            >
              {duration <= modelAvgDuration
                ? `比均值快 ${formatLatency(modelAvgDuration - duration)}`
                : `比均值慢 ${formatLatency(duration - modelAvgDuration)}`}
            </span>
          </div>
        </div>

        {/* 同模型相邻执行列表 */}
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[10px] text-text-tertiary uppercase">
            同架构其他执行记录 (点击即刻切换诊断)
          </span>

          {siblingTraces.length === 0 ? (
            <div className="py-4 text-center text-text-tertiary text-[10.5px]">
              暂无同模型的其他执行样本
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-separator-border/30">
              {siblingTraces.map((s) => {
                const sDuration = s.durationMs ?? 0
                const sSuccess = s.status === "success" || s.status === "completed" || s.status === "ok"

                return (
                  <div
                    key={s.id}
                    onClick={() => onSelectMetric?.(s)}
                    className="flex items-center justify-between py-2 px-1 hover:bg-background-secondary-hover/40 rounded transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cx(
                          "size-1.5 rounded-full shrink-0",
                          sSuccess ? "bg-emerald-500" : "bg-rose-500"
                        )}
                      />
                      <span className="text-text-secondary truncate max-w-[140px] text-[10.5px]">
                        run_{s.id.slice(0, 8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10.5px]">
                      <span className="font-bold text-text-primary">
                        {formatLatency(sDuration)}
                      </span>
                      {s.ttfoMs ? (
                        <span className="text-amber-500 text-[9.5px]">
                          T: {s.ttfoMs}ms
                        </span>
                      ) : null}
                      <RiArrowRightLine className="size-3 text-text-tertiary group-hover:text-accent-500 transition-colors" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
