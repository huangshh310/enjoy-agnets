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
    reasoning: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    tools: "border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    structured: "border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    vision: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    files: "border-accent-500/25 bg-accent-500/10 text-accent-500",
    skills: "border-teal-500/25 bg-teal-500/10 text-teal-600 dark:text-teal-400",
    image: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    video: "border-orange-500/25 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    speech: "border-pink-500/25 bg-pink-500/10 text-pink-600 dark:text-pink-400",
    transcription: "border-cyan-500/25 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    embedding: "border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    rerank: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    realtime: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400"
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
