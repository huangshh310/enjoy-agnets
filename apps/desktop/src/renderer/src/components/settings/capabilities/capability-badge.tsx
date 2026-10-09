/**
 * 模型能力徽标与指南卡片组件：遵循 BoardUI 语义 token。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export const CAP_LABEL_KEYS: Record<string, string> = {
  text: "settings.capabilities.capText",
  streaming: "settings.capabilities.capStreaming",
  reasoning: "settings.capabilities.capReasoning",
  tools: "settings.capabilities.capTools",
  structured: "settings.capabilities.capStructured",
  vision: "settings.capabilities.capVision",
  files: "settings.capabilities.capFiles",
  skills: "settings.capabilities.capSkills",
  image: "settings.capabilities.capImage",
  video: "settings.capabilities.capVideo",
  speech: "settings.capabilities.capSpeech",
  transcription: "settings.capabilities.capTranscription",
  embedding: "settings.capabilities.capEmbedding",
  rerank: "settings.capabilities.capRerank",
  realtime: "settings.capabilities.capRealtime"
}

export function CapabilityBadge({ capability, compact = false }: { capability: string; compact?: boolean }) {
  const t = useT()
  const labelKey = CAP_LABEL_KEYS[capability]
  const label = labelKey ? t(labelKey) : capability

  // 映射至 BoardUI 语义 token
  const tokenStyles: Record<string, string> = {
    text: "border-border-button-default bg-background-secondary-default text-text-secondary",
    streaming: "border-accent-500/25 bg-accent-500/10 text-accent-500",
    reasoning: "border-state-success-text/25 bg-state-success-text/10 text-state-success-text dark:text-state-success-text",
    tools: "border-chart-5/25 bg-chart-5/10 text-chart-5 dark:text-chart-5",
    structured: "border-accent-500/25 bg-accent-500/10 text-accent-500 dark:text-accent-500",
    vision: "border-status-yellow-text/25 bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text",
    files: "border-accent-500/25 bg-accent-500/10 text-accent-500",
    skills: "border-chart-1/25 bg-chart-1/10 text-chart-1 dark:text-chart-1",
    image: "border-border-error-default/25 bg-background-tertiary-error/10 text-text-error-primary dark:text-text-error-primary",
    video: "border-status-yellow-text/25 bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text",
    speech: "border-border-error-default/25 bg-background-tertiary-error/10 text-text-error-primary dark:text-text-error-primary",
    transcription: "border-chart-1/25 bg-chart-1/10 text-chart-1 dark:text-chart-1",
    embedding: "border-chart-5/25 bg-chart-5/10 text-chart-5 dark:text-chart-5",
    rerank: "border-chart-5/25 bg-chart-5/10 text-chart-5 dark:text-chart-5",
    realtime: "border-border-error-default/25 bg-background-tertiary-error/10 text-text-error-primary dark:text-text-error-primary"
  }

  const style = tokenStyles[capability] ?? "border-border-button-default bg-background-secondary-default text-text-secondary"

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md border font-medium",
        compact ? "px-1.5 py-0.5 text-caption-2-medium" : "px-2 py-0.5 text-caption-2-medium",
        style
      )}
    >
      {label}
    </span>
  )
}

export function CapabilityGuideItem({
  title,
  badge,
  desc
}: {
  title: string
  badge: string
  desc: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-caption-1-semibold text-text-primary">{title}</span>
        <CapabilityBadge capability={badge} compact />
      </div>
      <p className="text-caption-2-regular text-text-tertiary leading-relaxed mt-0.5">{desc}</p>
    </div>
  )
}
