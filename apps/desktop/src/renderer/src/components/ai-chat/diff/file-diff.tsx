/**
 * AI File Diff 文件差异对比组件：
 * 参考 https://www.aicss.dev/components/file-diff 顶级交互与设计规范。
 * 具备 4 列行号/符号对齐网格、左侧 3px 新增/删除状态指示条、全高 Gutter 分界线与增减统计徽标。
 */
import { RiCodeSSlashLine } from "@remixicon/react"
import type { DiffLine, FileDiffModel } from "@enjoy-agents/agent-core/diff"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function FileDiff({
  model,
  compact = false,
  embedded = false,
  className
}: {
  model: FileDiffModel
  compact?: boolean
  embedded?: boolean
  className?: string
}) {
  const t = useT()
  if (model.hunks.length === 0) {
    return (
      <div
        className={cx(
          "p-4 text-center text-caption-1-medium text-text-tertiary font-mono",
          !embedded && "rounded-xl border border-separator-border/70 bg-background-primary-default",
          className
        )}
      >
        {t("chat.noLineChanges")}
      </div>
    )
  }

  return (
    <div
      className={cx(
        "overflow-hidden font-mono",
        compact ? "max-h-72" : "min-h-0 flex-1",
        !embedded && "rounded-xl border border-separator-border/80 bg-background-primary-default shadow-2xs",
        className
      )}
    >
      {/* 头部：代码图标 + 文件路径 + 增减行统计 */}
      <header className="flex items-center justify-between gap-2 border-b border-separator-border/70 bg-background-secondary-default/50 px-3.5 py-2 text-[12px]">
        <div className="flex items-center gap-2 min-w-0">
          <RiCodeSSlashLine className="size-4 shrink-0 text-text-tertiary" />
          <span className="min-w-0 truncate font-semibold text-text-primary">
            {model.path}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] font-bold shrink-0">
          <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
            +{model.additions}
          </span>
          <span className="inline-flex items-center text-rose-600 dark:text-rose-400">
            -{model.deletions}
          </span>
        </div>
      </header>

      {/* Diff 主体行区域 (4 列等宽网格 + 左侧 3px 状态指示条) */}
      <div
        className={cx(
          "overflow-auto font-mono text-[11.5px] leading-relaxed relative bg-background-primary-default",
          compact ? "max-h-56" : "max-h-full"
        )}
      >
        {model.hunks.map((hunk) => (
          <section key={hunk.header}>
            {/* Hunk 分割标头 */}
            <div className="sticky top-0 z-10 bg-background-secondary-default/80 backdrop-blur-xs px-3 py-1 font-mono text-[10.5px] text-text-tertiary border-y border-separator-border/40 select-none">
              {hunk.header}
            </div>

            {/* Hunk 各行 */}
            <div className="relative">
              {hunk.lines.map((line, index) => (
                <DiffRow key={`${hunk.header}-${index}`} line={line} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function DiffRow({ line }: { line: DiffLine }) {
  const isAdd = line.kind === "add"
  const isDel = line.kind === "del"

  return (
    <div
      className={cx(
        "relative grid grid-cols-[32px_32px_18px_1fr] items-stretch text-[11.5px] transition-colors",
        isAdd && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        isDel && "bg-rose-500/10 text-rose-700 dark:text-rose-300",
        !isAdd && !isDel && "text-text-secondary hover:bg-background-secondary-hover/30"
      )}
    >
      {/* 左边缘 3px 状态装饰条 */}
      {isAdd ? (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
      ) : isDel ? (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-500" />
      ) : null}

      {/* 旧行号 */}
      <span className="select-none text-right pr-2 text-text-tertiary text-[10.5px] py-0.5">
        {line.oldNo ?? ""}
      </span>

      {/* 新行号 */}
      <span className="select-none text-right pr-2 text-text-tertiary text-[10.5px] py-0.5 border-r border-separator-border/40">
        {line.newNo ?? ""}
      </span>

      {/* +/- 符号 */}
      <span
        className={cx(
          "select-none text-center font-bold py-0.5",
          isAdd ? "text-emerald-600 dark:text-emerald-400" : isDel ? "text-rose-600 dark:text-rose-400" : "text-text-tertiary"
        )}
      >
        {isAdd ? "+" : isDel ? "-" : " "}
      </span>

      {/* 代码正文 */}
      <code className="whitespace-pre overflow-x-auto px-2 py-0.5 text-text-primary">
        {line.text}
      </code>
    </div>
  )
}
