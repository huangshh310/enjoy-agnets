/**
 * AI File Diff：Review / 对话侧文件 diff 渲染核。
 * 本刀接 @pierre/diffs（shiki-js + css-variables 同源），增减色仅行底+边条；
 * 大文件折叠仍走 applyDiffViewOptions / LARGE_FILE_LINES=400，并给人话提示+展开。
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { RiCodeSSlashLine } from "@remixicon/react"
import { toUnifiedDiff, type DiffLine, type FileDiffModel } from "@enjoy-agents/agent-core/diff"
import { PatchDiff } from "@pierre/diffs/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { useSourceFileReveal } from "../thread/sources/source-file-reveal"
import { SHIKI_TOKEN_VARS } from "../syntax/use-shiki-html"
import { applyDiffViewOptions, wouldFoldLargeFile } from "./file-diff-options"
import { diffTone, type DiffPalette } from "./diff-palette"
import {
  buildPierreDiffOptions,
  ensurePierreDiffTheme,
  pierreDiffHostStyle
} from "./pierre-diff-setup"

ensurePierreDiffTheme()

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
  const scrollerRef = useRef<HTMLDivElement>(null)
  const reveal = useSourceFileReveal((state) => state.reveal)
  const [forceExpanded, setForceExpanded] = useState(false)

  useEffect(() => {
    setForceExpanded(false)
  }, [model.path, foldLargeFiles])

  const foldedAway = wouldFoldLargeFile(model, foldLargeFiles) && !forceExpanded
  const view = useMemo(
    () =>
      applyDiffViewOptions(model, {
        hideWhitespace,
        foldLargeFiles: foldedAway
      }),
    [model, hideWhitespace, foldedAway]
  )
  const patch = useMemo(() => toUnifiedDiff(view), [view])
  const pierreOptions = useMemo(
    () => buildPierreDiffOptions({ wordWrap, wordDiff }),
    [wordWrap, wordDiff]
  )
  const hostStyle = useMemo(() => pierreDiffHostStyle(palette), [palette])

  useEffect(() => {
    if (!fill || !reveal || reveal.path !== model.path) return
    const root = scrollerRef.current
    if (!root) return
    // pierre 行号在 shadow 内；优先自家 data-source-line，再退到可穿透的 host 查询
    const target =
      root.querySelector(`[data-source-line="${reveal.line}"]`) ??
      root.querySelector(`[data-line-number="${reveal.line}"]`)
    target?.scrollIntoView({ block: "center" })
  }, [fill, reveal, model.path, view])

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
      data-testid={fill ? "source-file-diff" : undefined}
      data-diff-engine="pierre-shiki-js"
      className={cx(
        "overflow-hidden font-mono",
        fill && "flex h-full min-h-0 flex-1 flex-col",
        compact && !fill && "min-h-40 max-h-72",
        !fill && !compact && "min-h-0",
        !embedded && "rounded-xl border border-separator-border/80 bg-background-primary-default shadow-2xs",
        className
      )}
    >
      {!hideHeader ? (
        <header className="flex items-center justify-between gap-2 border-b border-separator-border/70 bg-background-secondary-default/50 px-3.5 py-2 text-caption-1-regular">
          <div className="flex min-w-0 items-center gap-2">
            <RiCodeSSlashLine className="size-4 shrink-0 text-text-tertiary" />
            <span
              data-testid={fill ? "source-file-path" : undefined}
              className="min-w-0 truncate font-semibold text-text-primary"
            >
              {model.path}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 font-mono text-caption-2-bold font-bold">
            <span className={cx("inline-flex items-center", tone.addStat)}>+{model.additions}</span>
            <span className={cx("inline-flex items-center", tone.delStat)}>-{model.deletions}</span>
          </div>
        </header>
      ) : null}

      <div
        ref={scrollerRef}
        className={cx(
          "relative overflow-auto bg-background-primary-default font-mono text-caption-2-regular leading-relaxed",
          SHIKI_TOKEN_VARS,
          fill && "min-h-0 flex-1",
          compact && !fill && "min-h-32 max-h-56",
          !fill && !compact && "max-h-[min(32rem,70vh)]"
        )}
        style={hostStyle}
      >
        <PatchDiff
          patch={patch}
          options={{
            ...pierreOptions,
            // 行评论：点行号时把 DiffLine 回传（#117 同面注释入口，非本刀主交付）
            enableGutterUtility: Boolean(onCommentLine),
            onLineNumberClick: onCommentLine
              ? ({ lineNumber, annotationSide }) => {
                  const match = findDiffLine(
                    view,
                    lineNumber,
                    annotationSide === "deletions" ? "del" : "add"
                  )
                  if (match) onCommentLine(match)
                }
              : undefined
          }}
          disableWorkerPool
          className="pierre-file-diff min-h-0 w-full"
          style={hostStyle}
        />
      </div>

      {foldedAway ? (
        <div
          data-testid="diff-fold-banner"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-separator-border/70 bg-background-secondary-default/60 px-3.5 py-2"
        >
          <p className="text-caption-1-regular text-text-tertiary">{t("chat.diffFoldLargeHint")}</p>
          <button
            type="button"
            data-testid="diff-fold-expand"
            className="shrink-0 cursor-pointer text-caption-1-medium text-accent-500 hover:underline"
            onClick={() => setForceExpanded(true)}
          >
            {t("chat.diffFoldLargeExpand")}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function findDiffLine(
  model: FileDiffModel,
  lineNo: number,
  prefer: "add" | "del" | "any" = "any"
): DiffLine | null {
  for (const hunk of model.hunks) {
    for (const line of hunk.lines) {
      if (prefer === "del" && line.kind === "del" && line.oldNo === lineNo) return line
      if (prefer === "add" && line.kind === "add" && line.newNo === lineNo) return line
      if (prefer === "any" && (line.newNo === lineNo || line.oldNo === lineNo)) return line
    }
  }
  // 回退：上下文行
  for (const hunk of model.hunks) {
    for (const line of hunk.lines) {
      if (line.newNo === lineNo || line.oldNo === lineNo) return line
    }
  }
  return null
}
