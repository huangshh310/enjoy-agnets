/**
 * 模型路由表格行组件。
 */
import {
  RiArrowRightLine,
  RiBrainLine,
  RiBrushLine,
  RiChat1Line,
  RiCodeSSlashLine,
  RiEyeLine,
  RiFilmLine,
  RiMicLine,
  RiPulseLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import type { ModelRoutingRowData } from "./model-routing.types"

export function ModelRoutingTableRow(props: {
  row: ModelRoutingRowData
  probing: boolean
  probe?: { ok: boolean; ms: number }
  onProbe: (id: string) => void
  onSelectModelTrace?: (modelId: string) => void
}) {
  const { row, probing, probe, onProbe, onSelectModelTrace } = props

  return (
    <tr className="group hover:bg-background-secondary-default/40 transition-colors">
      {/* 对外模型名称 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg border border-border-button-default/50 bg-background-secondary-default/80 p-1 shadow-2xs">
            <ModelBrandIcon
              modelId={row.id}
              providerKind={row.provider}
              size={18}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-[13px] font-semibold text-text-primary tracking-tight truncate">
                {row.id}
              </span>
              {row.isReasoning ? (
                <span
                  title="深度思考/推理模型"
                  className="inline-flex items-center gap-0.5 rounded bg-purple-500/10 px-1 py-0.2 font-mono text-[9.5px] font-semibold text-purple-600 dark:text-purple-400"
                >
                  <RiBrainLine className="size-2.5" />
                  <span>CoT</span>
                </span>
              ) : null}
            </div>
            <span className="text-[11px] text-text-tertiary truncate">{row.label}</span>
          </div>
        </div>
      </td>

      {/* 上游映射 */}
      <td className="px-4 py-3 font-mono text-[11.5px] text-text-secondary">
        <span className="inline-flex items-center gap-1 rounded bg-background-secondary-default/80 px-2 py-0.5 border border-border-button-default/40">
          {row.upstreamName}
        </span>
      </td>

      {/* 接口能力微标 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {row.capabilities.includes("text") || row.capabilities.includes("chat") ? (
            <span title="文本对话" className="flex size-5.5 items-center justify-center rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <RiChat1Line className="size-3" />
            </span>
          ) : null}
          {row.capabilities.includes("tools") ? (
            <span title="工具调用与代码" className="flex size-5.5 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RiCodeSSlashLine className="size-3" />
            </span>
          ) : null}
          {row.capabilities.includes("vision") ? (
            <span title="视觉理解" className="flex size-5.5 items-center justify-center rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <RiEyeLine className="size-3" />
            </span>
          ) : null}
          {row.capabilities.includes("image") ? (
            <span title="图像生成" className="flex size-5.5 items-center justify-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <RiBrushLine className="size-3" />
            </span>
          ) : null}
          {row.capabilities.includes("video") ? (
            <span title="视频生成" className="flex size-5.5 items-center justify-center rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <RiFilmLine className="size-3" />
            </span>
          ) : null}
          {row.capabilities.includes("realtime") ? (
            <span title="实时语音" className="flex size-5.5 items-center justify-center rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <RiMicLine className="size-3" />
            </span>
          ) : null}
        </div>
      </td>

      {/* 状态 */}
      <td className="px-4 py-3">
        <span
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption-2-medium",
            row.status === "healthy" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
            row.status === "degraded" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
            row.status === "unconfigured" && "bg-background-secondary-default text-text-tertiary border border-border-button-default"
          )}
        >
          <span
            className={cx(
              "size-1.5 rounded-full",
              row.status === "healthy" && "bg-emerald-500 animate-pulse",
              row.status === "degraded" && "bg-amber-500",
              row.status === "unconfigured" && "bg-text-tertiary"
            )}
          />
          {row.status === "healthy" ? "已就绪" : row.status === "degraded" ? "有异常" : "未配置"}
        </span>
      </td>

      {/* 模型来源 */}
      <td className="px-4 py-3 text-text-secondary font-medium">
        <span className="inline-flex items-center gap-1.5 rounded bg-background-secondary-default/80 px-2 py-0.5 text-caption-2-medium text-text-secondary border border-border-button-default/40">
          <ModelBrandIcon modelId={row.provider} providerKind={row.provider} size={13} />
          <span>{row.providerName}</span>
        </span>
      </td>
      {/* 调用量 */}
      <td className="px-4 py-3 text-right font-mono text-[12px] text-text-primary">
        {row.callCount > 0 ? (
          <span className="font-semibold">{row.callCount} 次</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>

      {/* 成功率 */}
      <td className="px-4 py-3 text-right font-mono text-[12px]">
        {row.callCount > 0 ? (
          <span className={cx("font-semibold", row.successRate >= 90 ? "text-emerald-500" : "text-amber-500")}>
            {row.successRate}%
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>

      {/* P95 延迟 */}
      <td className="px-4 py-3 text-right font-mono text-[12px] text-text-secondary">
        {row.p95DurationMs > 0 ? (
          <span>{(row.p95DurationMs / 1000).toFixed(1)}s</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>

      {/* 操作 */}
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1.5 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onProbe(row.id)}
            disabled={probing}
            title="测试连通性"
            className="h-7 px-2 text-caption-2-medium gap-1"
          >
            <RiPulseLine className={cx("size-3.5", probing && "animate-spin text-accent-500")} />
            {probe ? (
              <span className={cx("text-[10px] font-mono", probe.ok ? "text-emerald-500" : "text-rose-500")}>
                {probe.ms}ms
              </span>
            ) : (
              <span>探测</span>
            )}
          </Button>

          {onSelectModelTrace && row.callCount > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectModelTrace(row.id)}
              title="查看对应链路日志"
              className="h-7 px-2 text-caption-2-medium text-text-secondary hover:text-accent-500"
            >
              <RiArrowRightLine className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  )
}
