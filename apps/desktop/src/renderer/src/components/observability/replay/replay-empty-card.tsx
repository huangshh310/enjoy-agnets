/**
 * 回放工作台空态引导卡片组件。
 */
import {
  RiRefreshLine,
  RiSparklingLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"

export function ReplayEmptyCard({
  onLoadDemo,
  onRefresh
}: {
  onLoadDemo: () => void
  onRefresh: () => void
}) {
  return (
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
          onClick={onLoadDemo}
          className="gap-2 text-caption-2-medium cursor-pointer"
        >
          <RiSparklingLine className="size-3.5" />
          <span>载入经典 Agent 执行流体验回放</span>
        </Button>

        <Button
          variant="outline"
          onClick={onRefresh}
          className="gap-1.5 text-caption-2-medium cursor-pointer"
        >
          <RiRefreshLine className="size-3.5" />
          <span>刷新检查真实缓冲</span>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full text-left text-caption-2-medium pt-4 border-t border-separator-border/40">
        <div className="rounded-lg bg-background-secondary-default/40 p-3 border border-separator-border/30">
          <span className="font-semibold text-text-primary">1. Sequence 严格全序</span>
          <p className="mt-1 text-caption-2-regular text-text-tertiary leading-relaxed">
            每个主进程推送到前端的事件都携带原子自增序号，防止异步乱序。
          </p>
        </div>
        <div className="rounded-lg bg-background-secondary-default/40 p-3 border border-separator-border/30">
          <span className="font-semibold text-text-primary">2. 断线无缝重放</span>
          <p className="mt-1 text-caption-2-regular text-text-tertiary leading-relaxed">
            网络抖动或渲染重载时，通过 `observability.replay` 瞬间追平最新进度。
          </p>
        </div>
        <div className="rounded-lg bg-background-secondary-default/40 p-3 border border-separator-border/30">
          <span className="font-semibold text-text-primary">3. 隐私切片脱敏</span>
          <p className="mt-1 text-caption-2-regular text-text-tertiary leading-relaxed">
            回放事件由 `summarizeReplayEvents` 剥离 prompt 与敏感参数。
          </p>
        </div>
      </div>
    </div>
  )
}
