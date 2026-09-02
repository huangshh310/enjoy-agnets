/**
 * 会话空状态顶部：氛围微光晕 + 上下文脉冲胶囊 + 现代化大标题
 */
import { RiFolder6Line, RiGitBranchLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"


interface EmptyStateHeaderProps {
  workspaceName?: string
  workspaceRootLabel?: string
  changesCount?: number
  className?: string
}

export function EmptyStateHeader({
  workspaceName,
  workspaceRootLabel,
  changesCount = 0,
  className
}: EmptyStateHeaderProps) {
  const t = useT()
  const activeLabel = workspaceName || workspaceRootLabel || t("chat.emptyWorkspace")
  return (
    <div className={cx("relative flex flex-col items-center text-center select-none", className)}>
      {/* 1. 顶部工作区上下文脉冲胶囊 */}
      <div className="inline-flex items-center gap-2 rounded-full border border-border-button-default/70 bg-background-secondary-default/90 px-3.5 py-1 text-caption-1-medium text-text-secondary shadow-2xs backdrop-blur-md transition-all hover:border-border-button-default">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <div className="flex items-center gap-1.5 font-medium text-text-primary">
          <RiFolder6Line className="size-3.5 text-accent-500" aria-hidden />
          <span className="max-w-[180px] truncate">{activeLabel}</span>
        </div>
        {changesCount > 0 ? (
          <>
            <span className="text-text-tertiary/70">•</span>
            <div className="flex items-center gap-1 font-medium text-accent-600 dark:text-accent-400">
              <RiGitBranchLine className="size-3" aria-hidden />
              <span>{t("chat.emptyChanges", { count: changesCount })}</span>
            </div>
          </>
        ) : (
          <>
            <span className="text-text-tertiary/70">•</span>
            <span className="text-text-tertiary">{t("chat.emptyReady")}</span>
          </>
        )}
      </div>

      {/* 2. 核心大标题（参考 Bolt.new / Claude 人文质感排版） */}
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
        {t("chat.emptyHeadlineBefore")}
        <span className="font-serif italic font-normal text-accent-500 pr-0.5">{t("chat.emptyHeadlineEm")}</span>
        {t("chat.emptyHeadlineAfter")}
      </h1>

      <p className="mt-2.5 max-w-lg text-body-medium text-text-secondary leading-relaxed">
        {t("chat.emptyHintBefore")}{" "}
        <code className="inline-flex items-center rounded-md border border-border-button-default/60 bg-background-secondary-default/80 px-1.5 py-0.5 font-mono text-[13px] font-medium text-text-primary">
          {activeLabel}
        </code>{" "}
        {t("chat.emptyHintAfter")}
      </p>
    </div>
  )
}
