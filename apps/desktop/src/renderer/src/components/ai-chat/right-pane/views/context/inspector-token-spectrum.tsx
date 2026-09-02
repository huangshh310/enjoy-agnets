/**
 * 上下文 Token 视窗：真实折算用量，不展示编造的 Cache 命中率。
 */
import { RiPieChartLine } from "@remixicon/react"
import { formatTokens } from "../../../agent-limits/agent-limits-calculator"
import { useT } from "@renderer/i18n"
import type { ContextWindowStats, TokenSpectrumBucketId } from "./context-inspector.types"

const BUCKET_KEYS: Record<TokenSpectrumBucketId, string> = {
  messages: "chat.inspectorBucketMessages",
  system: "chat.inspectorBucketSystem",
  mcp: "chat.inspectorBucketMcp",
  skills: "chat.inspectorBucketSkills",
  memory: "chat.inspectorBucketMemory"
}

export function InspectorTokenSpectrum({ stats }: { stats: ContextWindowStats }) {
  const t = useT()
  const { usedTokens, maxTokens, usagePercent, buckets } = stats
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, usagePercent) / 100) * circumference

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
          <RiPieChartLine className="size-4 text-accent-500" />
          <span>{t("chat.inspectorTokenWindow")}</span>
        </div>
        <span className="font-mono text-caption-2-regular text-text-tertiary">
          {formatTokens(usedTokens)} / {formatTokens(maxTokens)}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-3.5">
        <UsageRing
          radius={radius}
          circumference={circumference}
          strokeDashoffset={strokeDashoffset}
          usagePercent={usagePercent}
          usedLabel={t("chat.inspectorUsed")}
        />
        <BucketLegend usedTokens={usedTokens} maxTokens={maxTokens} buckets={buckets} />
      </div>
    </section>
  )
}

function UsageRing({
  radius,
  circumference,
  strokeDashoffset,
  usagePercent,
  usedLabel
}: {
  radius: number
  circumference: number
  strokeDashoffset: number
  usagePercent: number
  usedLabel: string
}) {
  return (
    <div className="relative flex size-18 shrink-0 items-center justify-center">
      <svg className="size-full -rotate-90" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={radius}
          className="stroke-background-secondary-default"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          className="stroke-accent-500 transition-all duration-500 ease-out"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex select-none flex-col items-center justify-center text-center">
        <span className="font-mono text-caption-1-medium tracking-tight text-text-primary">
          {usagePercent}%
        </span>
        <span className="text-caption-2-regular uppercase tracking-wider text-text-tertiary">
          {usedLabel}
        </span>
      </div>
    </div>
  )
}

function BucketLegend({
  usedTokens,
  maxTokens,
  buckets
}: {
  usedTokens: number
  maxTokens: number
  buckets: ContextWindowStats["buckets"]
}) {
  const t = useT()
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-baseline justify-between font-mono text-caption-2-medium">
        <span className="font-semibold text-text-primary">
          {usedTokens.toLocaleString()}{" "}
          <span className="font-normal text-text-tertiary">Tokens</span>
        </span>
        <span className="text-text-tertiary">{t("chat.inspectorCap", { n: formatTokens(maxTokens) })}</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-background-secondary-default">
        {buckets.map((bucket) => {
          const widthRatio = usedTokens > 0 ? (bucket.tokens / usedTokens) * 100 : 0
          if (widthRatio <= 0) return null
          return (
            <div
              key={bucket.id}
              style={{ width: `${widthRatio}%` }}
              className={`${bucket.barClass} transition-all duration-300`}
              title={`${t(BUCKET_KEYS[bucket.id])}: ${formatTokens(bucket.tokens)}`}
            />
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5 text-caption-2-regular">
        {buckets.map((bucket) => (
          <div key={bucket.id} className="flex min-w-0 items-center justify-between gap-1 font-mono">
            <span className="flex min-w-0 items-center gap-1 truncate text-text-secondary">
              <span className={`size-1.5 shrink-0 rounded-full ${bucket.barClass}`} />
              <span className="truncate">{t(BUCKET_KEYS[bucket.id])}</span>
            </span>
            <span className="shrink-0 text-text-tertiary">{formatTokens(bucket.tokens)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
