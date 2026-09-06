/**
 * 全局技能空态引导卡片 (Skills Empty State)。
 * 告别晦涩的开发表单，采用温暖、高质感的 C 端导流与装配引导设计。
 */
import {
  RiArrowRightLine,
  RiCompass3Line,
  RiFolderOpenLine,
  RiSparklingLine
} from "@remixicon/react"
import type { SkillTargetId } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { TARGET_SHORT_LABELS } from "../constants/skills-ui.constants"

export function SkillsEmptyState({
  activeTargetId,
  onClearTargetFilter,
  onGoToStore,
  onPickFolder
}: {
  activeTargetId?: SkillTargetId | null
  onClearTargetFilter?: () => void
  onGoToStore?: () => void
  onPickFolder: () => void
}) {
  const agentLabel = activeTargetId ? TARGET_SHORT_LABELS[activeTargetId] : null

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border border-separator-border/80 bg-background-primary-default p-12 text-center shadow-card">
      <div className="pointer-events-none absolute -top-12 size-48 rounded-full bg-accent-500/10 blur-3xl" />

      <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-700 dark:text-accent-300 border border-accent-500/30 mb-4 shadow-xs">
        <RiSparklingLine className="size-7" />
      </div>

      <h3 className="relative z-10 text-title-3-semibold text-text-primary tracking-tight mb-2">
        {agentLabel ? `${agentLabel} 助手尚未开启专属技能` : "尚未装配任何技能能力包"}
      </h3>

      <p className="relative z-10 max-w-md text-caption-1-regular text-text-secondary leading-relaxed mb-6">
        {agentLabel
          ? `当前没有技能关联到 ${agentLabel}。你可以前往精选集市为它装备专业能力，或在左侧已有技能组中勾选激活 ${agentLabel}。`
          : "技能是赋予 AI 助手在代码重构、全栈测试、UI 审美与复杂工程自动化等领域的即插即用超能力。"}
      </p>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
        {onGoToStore ? (
          <Button
            size="sm"
            onClick={onGoToStore}
            className="gap-1.5 h-8.5 px-4 text-caption-2-medium shadow-xs"
          >
            <RiCompass3Line className="size-4" />
            <span>探索精选技能集市</span>
            <RiArrowRightLine className="size-3.5 opacity-70" />
          </Button>
        ) : null}

        {activeTargetId && onClearTargetFilter ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onClearTargetFilter}
            className="h-8.5 text-caption-2-medium"
          >
            <span>查看全部已安装技能</span>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onPickFolder}
            className="gap-1.5 h-8.5 text-caption-2-medium"
          >
            <RiFolderOpenLine className="size-4 text-text-tertiary" />
            <span>选择本地技能文件夹</span>
          </Button>
        )}
      </div>
    </div>
  )
}
