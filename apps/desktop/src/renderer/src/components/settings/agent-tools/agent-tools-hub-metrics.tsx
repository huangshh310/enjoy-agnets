/**
 * 智能体工坊指标卡：当前引擎、就绪率、传输与审批。
 */
import type { ReactNode } from "react"
import { RiPulseLine, RiShieldCheckLine, RiTerminalBoxLine } from "@remixicon/react"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"

export function AgentToolsHubMetrics({
  runtimeId,
  activeLabel,
  modelText,
  readyCount,
  totalCount,
  readyPercent
}: {
  runtimeId: string
  activeLabel: string
  modelText: string
  readyCount: number
  totalCount: number
  readyPercent: number
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="当前活跃主引擎" pulse>
        <div className="mt-1.5 flex items-center gap-2 truncate">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default">
            <AgentBrandIcon id={runtimeId} size={14} />
          </span>
          <span className="truncate text-body-medium text-text-primary">{activeLabel}</span>
        </div>
        <span className="mt-1 truncate font-mono text-caption-2-medium text-text-secondary">{modelText}</span>
      </MetricCard>
      <MetricCard title="本机环境装载率" icon={<RiTerminalBoxLine className="size-3.5 text-text-tertiary" />}>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-headline-medium text-text-primary">
            {readyCount}
            <span className="text-caption-1-medium text-text-tertiary">/{totalCount}</span>
          </span>
          <span className="text-caption-2-medium text-accent-600">({readyPercent}% 已装载)</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background-secondary-hover">
          <div className="h-full rounded-full bg-accent-500 transition-all duration-500" style={{ width: `${readyPercent}%` }} />
        </div>
      </MetricCard>
      <MetricCard title="通信与流式协议" icon={<RiPulseLine className="size-3.5 text-text-tertiary" />}>
        <StatusLine label="ACP Stdio 管道" hint="沙箱隔离 · 实时双向 Token 流" />
      </MetricCard>
      <MetricCard title="执行安全与审批" icon={<RiShieldCheckLine className="size-3.5 text-text-tertiary" />}>
        <StatusLine label="HMAC 签名放行" hint="写盘 / Shell 命令防误触" />
      </MetricCard>
    </div>
  )
}

function MetricCard({
  title,
  icon,
  pulse,
  children
}: {
  title: string
  icon?: ReactNode
  pulse?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
      <span className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
        <span>{title}</span>
        {pulse ? <span className="size-2 animate-pulse rounded-full bg-accent-500" /> : icon}
      </span>
      {children}
    </div>
  )
}

function StatusLine({ label, hint }: { label: string; hint: string }) {
  return (
    <>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-accent-500" />
        <span className="text-body-medium text-text-primary">{label}</span>
      </div>
      <span className="mt-1 truncate text-caption-2-regular text-text-secondary">{hint}</span>
    </>
  )
}
