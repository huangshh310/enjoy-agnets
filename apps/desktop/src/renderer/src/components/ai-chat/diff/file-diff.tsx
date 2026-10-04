/**
 * AI File Diff 文件差异对比组件：
 * 参考 https://www.aicss.dev/components/file-diff 顶级交互与设计规范。
 * 具备 4 列行号/符号对齐网格、左侧 3px 新增/删除状态指示条、全高 Gutter 分界线与增减统计徽标。
 */
import { useMemo } from "react"
import { RiCodeSSlashLine } from "@remixicon/react"
import type { DiffLine, FileDiffModel } from "@enjoy-agents/agent-core/diff"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { applyDiffViewOptions, splitWordDiff } from "./file-diff-options"
import { diffTone, type DiffPalette } from "./diff-palette"
export function FileDiff({
  model,
  compact = false,
  embedded = false,
  fill = false,
  hideHeader = false,
  wordWrap = false,
  wordDiff = false,
  hideWhitespace = false,
  foldLargeFiles = false,
  palette = "default",
  onCommentLine,
  className
}: {
  model: FileDiffModel
  compact?: boolean
  embedded?: boolean
  fill?: boolean
  hideHeader?: boolean
  wordWrap?: boolean
  wordDiff?: boolean
  hideWhitespace?: boolean
  foldLargeFiles?: boolean
  palette?: DiffPalette
  onCommentLine?: (line: DiffLine) => void
  className?: string
}) {
  const t = useT()
  const tone = diffTone(palette)
  const view = useMemo(
    () => applyDiffViewOptions(model, { hideWhitespace, foldLargeFiles }),
    [model, hideWhitespace, foldLargeFiles]
  )
  if (view.hunks.length === 0) {
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
        fill && "flex h-full min-h-0 flex-1 flex-col",
        compact && !fill && "max-h-72",
        !fill && !compact && "min-h-0",
        !embedded && "rounded-xl border border-separator-border/80 bg-background-primary-default shadow-2xs",
        className
      )}
    >
      {!hideHeader ? (
        <header className="flex items-center justify-between gap-2 border-b border-separator-border/70 bg-background-secondary-default/50 px-3.5 py-2 text-caption-1-regular">
          <div className="flex items-center gap-2 min-w-0">
            <RiCodeSSlashLine className="size-4 shrink-0 text-text-tertiary" />
            <span className="min-w-0 truncate font-semibold text-text-primary">
              {model.path}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-caption-2-bold font-bold shrink-0">
            <span className={cx("inline-flex items-center", tone.addStat)}>
              +{model.additions}
            </span>
            <span className={cx("inline-flex items-center", tone.delStat)}>
              -{model.deletions}
            </span>
          </div>
        </header>
      ) : null}

      {/* Diff 主体行区域 (4 列等宽网格 + 左侧 3px 状态指示条) */}
      <div
        className={cx(
          "overflow-auto font-mono text-caption-2-regular leading-relaxed relative bg-background-primary-default",
          fill && "min-h-0 flex-1",
          compact && !fill && "max-h-56",
          !fill && !compact && "max-h-[min(32rem,70vh)]"
        )}
      >
        {view.hunks.map((hunk) => (
          <section key={hunk.header}>
            <div className="sticky top-0 z-10 bg-background-secondary-default/80 backdrop-blur-xs px-3 py-1 font-mono text-caption-2-regular text-text-tertiary border-y border-separator-border/40 select-none">
              {hunk.header}
            </div>
            <div className="relative">
              {hunk.lines.map((line, index) => (
                <DiffRow
                  key={`${hunk.header}-${index}`}
                  line={line}
                  prev={hunk.lines[index - 1]}
                  wordWrap={wordWrap}
                  wordDiff={wordDiff}
                  tone={tone}
                  onComment={onCommentLine}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function DiffRow({
  line,
  prev,
  wordWrap,
  wordDiff,
  tone,
  onComment
}: {
  line: DiffLine
  prev?: DiffLine
  wordWrap: boolean
  wordDiff: boolean
  tone: ReturnType<typeof diffTone>
  onComment?: (line: DiffLine) => void
}) {
  const t = useT()
  const isAdd = line.kind === "add"
  const isDel = line.kind === "del"
  const pair = wordDiff && isAdd && prev?.kind === "del" ? splitWordDiff(prev.text, line.text) : null

  return (
    <div
      className={cx(
        "group/diff relative grid grid-cols-[32px_32px_18px_1fr] items-stretch text-caption-2-regular transition-colors",
        isAdd && tone.addRow,
        isDel && tone.delRow,
        !isAdd && !isDel && "text-text-secondary hover:bg-background-secondary-hover/30"
      )}
    >
      {isAdd ? (
        <span className={cx("absolute left-0 top-0 bottom-0 w-[3px]", tone.addBar)} />
      ) : isDel ? (
        <span className={cx("absolute left-0 top-0 bottom-0 w-[3px]", tone.delBar)} />
      ) : null}
      <span className="select-none text-right pr-2 text-text-tertiary text-caption-2-regular py-0.5">
        {line.oldNo ?? ""}
      </span>
      <span className="select-none text-right pr-2 text-text-tertiary text-caption-2-regular py-0.5 border-r border-separator-border/40">
        {line.newNo ?? ""}
      </span>
      <span
        className={cx(
          "select-none text-center font-bold py-0.5",
          isAdd ? tone.addMark : isDel ? tone.delMark : "text-text-tertiary"
        )}
      >
        {isAdd ? "+" : isDel ? "-" : " "}
      </span>
      <code
        className={cx(
          "px-2 py-0.5 text-text-primary",
          wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"
        )}
      >
        {pair ? (
          <>
            {pair.prefix}
            <span className={tone.addWord}>{pair.added}</span>
            {pair.suffix}
          </>
        ) : (
          line.text
        )}
      </code>
      {onComment ? (
        <button
          type="button"
          className="absolute right-1 top-0 hidden rounded px-1 text-caption-2-regular text-accent-500 group-hover/diff:block"
          onClick={() => onComment(line)}
        >
          {t("chat.commentDiffLine")}
        </button>
      ) : null}
    </div>
  )
}
