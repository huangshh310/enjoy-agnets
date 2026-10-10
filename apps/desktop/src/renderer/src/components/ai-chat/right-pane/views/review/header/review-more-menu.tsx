/**
 * 审查栏更多操作菜单组件：
 * 对齐 Codex Image #2 的“...”下拉菜单，提供刷新、自动换行、隐藏空白、文字差异与 Git apply 复制等高阶操作。
 */

import { useRef, useState } from "react"
import {
  RiCheckLine,
  RiFileCopyLine,
  RiFileTextLine,
  RiFontSize,
  RiMoreFill,
  RiRefreshLine,
  RiSparklingLine,
  RiSpace,
  RiTerminalBoxLine
} from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { applySessionMenuCloseFocus } from "@renderer/components/ai-chat/sidebar/session-menu-placement"
import { useT } from "@renderer/i18n"
import type { DiffPalette } from "../../../../diff/diff-palette"
import type { ReviewOptions } from "../types/review.types"
import { ReviewDiffPaletteMenu } from "./review-diff-palette-menu"

export function ReviewMoreMenu(props: {
  options: ReviewOptions
  palette: DiffPalette
  onPalette: (palette: DiffPalette) => void
  onToggleOption: (key: keyof ReviewOptions) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  onCopyApplyCmd?: () => void
  onCopyUnifiedDiff?: () => void
}) {
  const {
    options,
    palette,
    onPalette,
    onToggleOption,
    onRefresh,
    isRefreshing,
    onCopyApplyCmd,
    onCopyUnifiedDiff
  } = props
  const t = useT()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const openedByPointer = useRef(false)
  const [copiedApply, setCopiedApply] = useState(false)
  const [copiedDiff, setCopiedDiff] = useState(false)

  function handleCopyApply() {
    onCopyApplyCmd?.()
    setCopiedApply(true)
    setTimeout(() => setCopiedApply(false), 1500)
  }

  function handleCopyDiff() {
    onCopyUnifiedDiff?.()
    setCopiedDiff(true)
    setTimeout(() => setCopiedDiff(false), 1500)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          data-testid="review-more-menu"
          title={t("chat.previewRailLabel")}
          onPointerDown={() => {
            openedByPointer.current = true
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return
            openedByPointer.current = false
            delete triggerRef.current?.dataset.pointerReturn
          }}
          onBlur={() => {
            delete triggerRef.current?.dataset.pointerReturn
          }}
          className={cx(
            "cursor-pointer rounded-md p-1.5 text-text-secondary outline-none transition-colors",
            "hover:bg-background-secondary-hover hover:text-text-primary",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            "data-[pointer-return]:ring-0 data-[pointer-return]:focus-visible:ring-0"
          )}
        >
          <RiMoreFill className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 p-1"
        onCloseAutoFocus={(event) => {
          applySessionMenuCloseFocus(event, openedByPointer.current, triggerRef.current)
          openedByPointer.current = false
        }}
      >
        {onRefresh ? (
          <>
            <DropdownMenuItem
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 py-1.5 px-2 text-caption-1-medium cursor-pointer"
            >
              <RiRefreshLine className={`size-4 ${isRefreshing ? "animate-spin text-accent-500" : ""}`} />
              <span>{t("chat.reviewRefreshHistory")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuItem
          onClick={() => onToggleOption("wordWrap")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiFontSize className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewToggleWordWrap")}</span>
          </div>
          {options.wordWrap ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onToggleOption("foldLargeFiles")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiFileTextLine className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewFoldLargeFiles")}</span>
          </div>
          {options.foldLargeFiles ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onToggleOption("richPreview")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiSparklingLine className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewRichPreview")}</span>
          </div>
          {options.richPreview ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onToggleOption("wordDiff")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiFontSize className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewWordDiff")}</span>
          </div>
          {options.wordDiff ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onToggleOption("hideWhitespace")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiSpace className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewHideWhitespace")}</span>
          </div>
          {options.hideWhitespace ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <ReviewDiffPaletteMenu palette={palette} onPalette={onPalette} />

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleCopyDiff}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiFileCopyLine className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewCopyUnifiedDiff")}</span>
          </div>
          {copiedDiff ? <span className="text-caption-2-regular text-state-success-text">{t("chat.reviewCopied")}</span> : null}
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 py-1.5 px-2 text-caption-1-medium cursor-pointer">
            <RiTerminalBoxLine className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewAdvanced")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56 p-1">
            <DropdownMenuItem
              onClick={handleCopyApply}
              className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
            >
              <span>{t("chat.reviewCopyGitApply")}</span>
              {copiedApply ? <span className="text-caption-2-regular text-state-success-text">{t("chat.reviewCopied")}</span> : null}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
